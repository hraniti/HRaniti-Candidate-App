import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import OfferResponse from "./OfferResponse";

export const dynamic = "force-dynamic";

function validToken(offerId: string, token: string) {
  const secret = process.env.OFFER_PORTAL_SECRET;
  if (!secret || !token) return false;
  const expected = createHmac("sha256", secret).update(offerId).digest("hex");
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(token)); } catch { return false; }
}
function cleanHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<iframe[\s\S]*?<\/iframe>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/javascript:/gi, "");
}
function esc(v: unknown) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c] || c)); }

export default async function OfferReviewPage({ params, searchParams }: { params: { offerId: string }, searchParams: { token?: string } }) {
  const token = searchParams?.token || "";
  const offerId = params.offerId;
  if (!validToken(offerId, token)) return <main className="min-h-screen bg-[#FCFCFA] flex items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-[#DDE5EA] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#173454]">Offer link unavailable</h1><p className="mt-2 text-sm text-[#71859A]">This secure offer link is invalid or no longer available.</p></div></main>;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return <main className="p-8">Offer service is not configured.</main>;
  const admin = createClient(url, service, { auth: { autoRefreshToken:false, persistSession:false } });
  const { data: offer } = await admin.from("offers").select("*").eq("id", offerId).single();
  if (!offer) return <main className="min-h-screen bg-[#FCFCFA] flex items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-[#DDE5EA] bg-white p-8 text-center"><h1 className="text-xl font-semibold text-[#173454]">Offer not found</h1></div></main>;
  if (offer.offer_expiry_date && new Date(offer.offer_expiry_date + "T23:59:59").getTime() < Date.now() && ["Sent","Viewed"].includes(offer.status)) {
    await admin.from("offers").update({ status: "Expired", expired_at: new Date().toISOString() }).eq("id", offer.id);
    return <main className="min-h-screen bg-[#FCFCFA] flex items-center justify-center p-6"><div className="max-w-xl rounded-2xl border border-[#DDE5EA] bg-white p-8 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B34E3E]">HRANITI</p><h1 className="mt-3 text-2xl font-semibold text-[#173454]">This offer has expired.</h1><p className="mt-2 text-sm text-[#71859A]">Please contact the hiring team if you need a revised offer.</p></div></main>;
  }
  if (["Accepted","Declined","Changes requested","Withdrawn","Expired"].includes(offer.status)) return <main className="min-h-screen bg-[#FCFCFA] flex items-center justify-center p-6"><div className="max-w-xl rounded-2xl border border-[#DDE5EA] bg-white p-8 text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167D73]">HRANITI</p><h1 className="mt-3 text-2xl font-semibold text-[#173454]">This offer is {offer.status.toLowerCase()}.</h1><p className="mt-2 text-sm text-[#71859A]">The offer can no longer accept another response.</p></div></main>;
  await admin.from("offers").update({ status: "Viewed", viewed_at: new Date().toISOString() }).eq("id", offerId).in("status", ["Sent","Viewed"]);
  const company = await admin.from("companies").select("name").eq("id", offer.company_id).single();
  const companyName = company.data?.name || "HRaniti";
  const letter = cleanHtml(offer.letter_html || offer.letter_body || "<p>Your offer letter is ready to review.</p>");
  return <main className="min-h-screen bg-[#FCFCFA] py-8 px-4 sm:py-12"><div className="mx-auto max-w-4xl"><div className="rounded-2xl border border-[#DDE5EA] bg-white shadow-sm overflow-hidden"><div className="border-b border-[#E6ECEF] px-6 py-5 sm:px-10"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167D73]">{esc(companyName)}</p><h1 className="mt-2 text-2xl font-semibold text-[#173454]">Offer of Employment</h1><p className="mt-1 text-sm text-[#71859A]">Dear {esc(offer.candidate_name || "Candidate")}, please review your offer below.</p></div><div className="px-6 py-8 sm:px-10"><article className="prose prose-sm max-w-none text-[#2F4658]" dangerouslySetInnerHTML={{__html:letter}}/><div className="mt-10 border-t border-[#E6ECEF] pt-7"><OfferResponse offerId={offerId} token={token}/></div></div></div><p className="mt-5 text-center text-[11px] text-[#9AA8B3]">This is a secure HRaniti offer page. Your response is recorded against this offer.</p></div></main>;
}