import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function validToken(offerId: string, token: string) {
  const secret = process.env.OFFER_PORTAL_SECRET;
  if (!secret || !token) return false;
  const expected = createHmac("sha256", secret).update(offerId).digest("hex");
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(token)); } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const offerId = String(body.offerId || ""), token = String(body.token || ""), response = String(body.response || ""), note = String(body.note || "").trim();
    if (!offerId || !validToken(offerId, token)) return NextResponse.json({ error: "This offer link is invalid or expired." }, { status: 401 });
    if (!["Accepted","Changes requested","Declined"].includes(response)) return NextResponse.json({ error: "Invalid response." }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return NextResponse.json({ error: "Server configuration is incomplete." }, { status: 500 });
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: offer, error } = await admin.from("offers").select("*").eq("id", offerId).single();
    if (error || !offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    if (offer.offer_expiry_date && new Date(offer.offer_expiry_date + "T23:59:59").getTime() < Date.now()) {
      await admin.from("offers").update({ status: "Expired", expired_at: new Date().toISOString() }).eq("id", offerId);
      await admin.from("offer_events").insert({ offer_id: offerId, company_id: offer.company_id, event_type: "offer_expired", actor_id: null, metadata: { source: "candidate_response" } });
      return NextResponse.json({ error: "This offer has expired and cannot receive a response." }, { status: 409 });
    }
    if (!["Sent","Viewed"].includes(offer.status)) return NextResponse.json({ error: "This offer is no longer awaiting a response." }, { status: 409 });
    const nextStatus = response;
    const { error: updateError } = await admin.from("offers").update({
      status: nextStatus,
      candidate_response: response,
      response_note: note || null,
      candidate_message: note || null,
      responded_at: new Date().toISOString()
    }).eq("id", offerId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    await admin.from("offer_events").insert({ offer_id: offerId, company_id: offer.company_id, event_type: response.toLowerCase().replaceAll(" ","_"), actor_id: null, metadata: { response_note: note, channel: "candidate_portal" } });
    if (response === "Accepted" && offer.application_id) await admin.from("applications").update({ pipeline_stage: "Offer", next_step: "Complete pre-employment checks" }).eq("id", offer.application_id);
    if (response === "Declined" && offer.application_id) await admin.from("applications").update({ status: "declined", next_step: "Closed" }).eq("id", offer.application_id);
    if (response === "Declined") {
      const {data:bgvCases}=await admin.from("background_checks").select("id,candidate_name,status,provider_org_id,verification_method").eq("company_id",offer.company_id).eq("offer_id",offer.id).in("status",["Requested","In progress","Needs attention"]);
      for (const bgv of bgvCases||[]) {
        if (bgv.verification_method === "Internal") {
          await admin.from("background_checks").update({status:"Cancelled",stop_reason:"Candidate declined the offer.",stopped_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",bgv.id);
          await admin.from("background_check_events").insert({background_check_id:bgv.id,company_id:offer.company_id,event_type:"bgv_cancelled_after_offer_decline",metadata:{reason:"Candidate declined the offer."}});
        } else {
          const now=new Date().toISOString();
          await admin.from("background_checks").update({stop_request_status:"Requested",stop_requested_at:now,stop_reason:"Candidate declined the offer.",updated_at:now}).eq("id",bgv.id);
          await admin.from("background_check_events").insert({background_check_id:bgv.id,company_id:offer.company_id,event_type:"provider_stop_requested",metadata:{reason:"Candidate declined the offer.",trigger:"candidate_offer_response"}});
          if (bgv.provider_org_id && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
            const {data:pm}=await admin.from("bgv_provider_members").select("email").eq("provider_org_id",bgv.provider_org_id).eq("status","Active").not("email","is",null).limit(1).maybeSingle();
            if(pm?.email){
              const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"").replace(/\/$/,"");
              await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[pm.email],subject:"Stop BGV verification — candidate declined offer",html:`<p>Hello,</p><p>The candidate <strong>${String(bgv.candidate_name||"Candidate").replace(/</g,"&lt;")}</strong> has declined the offer. Please stop the active background verification and acknowledge the request in the HRANITI provider portal.</p><p><a href="${appUrl}/provider/bgv">Open provider portal</a></p>`})});
            }
          }
        }
      }
    }
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record response." }, { status: 500 });
  }
}