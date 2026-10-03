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
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to record response." }, { status: 500 });
  }
}