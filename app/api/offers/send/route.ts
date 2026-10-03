import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

export const runtime = "nodejs";

function tokenFor(offerId: string) {
  const secret = process.env.OFFER_PORTAL_SECRET;
  if (!secret) throw new Error("OFFER_PORTAL_SECRET is not configured.");
  return createHmac("sha256", secret).update(offerId).digest("hex");
}
function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] ?? c));
}
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json();
    const offerId = String(body.offerId || "");
    const test = body.test === true;
    if (!offerId) return NextResponse.json({ error: "Offer is required." }, { status: 400 });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM_EMAIL, appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!url || !anon || !service) return NextResponse.json({ error: "Supabase server configuration is incomplete." }, { status: 500 });
    if (!resendKey || !from) return NextResponse.json({ error: "Email is not configured yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel." }, { status: 503 });
    if (!appUrl) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL is not configured." }, { status: 500 });
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return NextResponse.json({ error: "Your session is no longer valid." }, { status: 401 });
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: membership } = await admin.from("company_team_members").select("company_id,role,status").eq("user_id", userData.user.id).eq("status", "Active").limit(1).maybeSingle();
    if (!membership?.company_id) return NextResponse.json({ error: "You are not an active company member." }, { status: 403 });
    const { data: offer, error: offerError } = await admin.from("offers").select("*").eq("id", offerId).eq("company_id", membership.company_id).single();
    if (offerError || !offer) return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    if (offer.status !== "Approved") return NextResponse.json({ error: "Only approved offers can be sent." }, { status: 400 });
    const recipient = test ? userData.user.email : offer.candidate_email;
    if (!recipient) return NextResponse.json({ error: "The candidate has no email address." }, { status: 400 });
    const reviewUrl = `${appUrl.replace(/\/$/, "")}/offer-review/${encodeURIComponent(offer.id)}?token=${tokenFor(offer.id)}`;
    const candidateName = offer.candidate_name || "there", jobTitle = offer.job_title || "your new role";
    const companyResult = await admin.from("companies").select("name").eq("id", offer.company_id).single();
    const companyName = companyResult.data?.name || "HRaniti";
    const subject = `${test ? "[TEST] " : ""}Offer of Employment — ${jobTitle}`;
    const message = offer.candidate_message || "We are pleased to share your offer. Please review the offer details and respond using the secure link below.";
    const html = `<!doctype html><html><body style="margin:0;background:#f7f9f8;font-family:Arial,sans-serif;color:#173454"><div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #e1e8e7;border-radius:18px;padding:36px"><div style="font-weight:700;font-size:22px;color:#173454">${esc(companyName)}</div>${test ? '<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff7e6;color:#8a641e;font-size:12px">HRaniti test email — sample candidate workflow</div>' : ""}<p style="margin-top:30px">Dear ${esc(candidateName)},</p><p>We are pleased to offer you the position of <strong>${esc(jobTitle)}</strong> at ${esc(companyName)}.</p><p>${esc(message)}</p><p style="margin:28px 0"><a href="${reviewUrl}" style="display:inline-block;background:#167d73;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:600">View and review your offer</a></p><p style="font-size:12px;color:#71859a">This secure link is unique to your offer. You can review the full letter and choose Accept, Request changes, or Decline.</p><p>Regards,<br/>HR Team<br/><strong>${esc(companyName)}</strong></p></div></body></html>`;
    const resendResponse = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` }, body: JSON.stringify({ from, to: [recipient], subject, html, headers: { "X-HRaniti-Offer-Id": offer.id } }) });
    const resendBody = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) return NextResponse.json({ error: resendBody?.message || "Email provider rejected the message." }, { status: 502 });
    const now = new Date().toISOString();
    const { error: updateError } = await admin.from("offers").update({ status: "Sent", sent_at: now, updated_by: userData.user.id }).eq("id", offer.id);
    if (updateError) return NextResponse.json({ error: "Email was sent, but the offer status could not be updated. Check the offer history." }, { status: 500 });
    await admin.from("offer_events").insert({ offer_id: offer.id, company_id: offer.company_id, event_type: "offer_sent", actor_id: userData.user.id, metadata: { provider: "resend", email_id: resendBody?.id || null, recipient, test, sent_at: now } });
    return NextResponse.json({ ok: true, emailId: resendBody?.id || null, recipient, test });
  } catch (error) {
    console.error("offer send failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send offer." }, { status: 500 });
  }
}