"use client";
import { useState } from "react";
export default function OfferResponse({offerId,token}:{offerId:string;token:string}) {
  const [note,setNote]=useState(""), [busy,setBusy]=useState(false), [done,setDone]=useState("");
  async function submit(response:string) {
    setBusy(true);
    const r=await fetch("/api/offers/respond",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({offerId,token,response,note})});
    const b=await r.json().catch(()=>({}));
    setBusy(false);
    if (!r.ok) { setDone(b.error||"We could not record your response."); return; }
    setDone(response==="Accepted" ? "Thank you. Your acceptance has been recorded." : response==="Declined" ? "Your decision has been recorded." : "Your change request has been sent to the hiring team.");
  }
  if(done) return <div className="rounded-xl border border-[#B9DDD7] bg-[#F3FAF8] p-5 text-center"><p className="text-sm font-semibold text-[#167D73]">{done}</p></div>;
  return <div><h2 className="text-base font-semibold text-[#173454]">Your response</h2><p className="mt-1 text-xs text-[#71859A]">Choose one option. You can add a note if you are requesting changes or have a question.</p><textarea value={note} onChange={e=>setNote(e.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-[#DDE5EA] p-3 text-sm outline-none focus:border-[#A9D4CE]" placeholder="Optional message to the hiring team"/><div className="mt-4 flex flex-col gap-2 sm:flex-row"><button disabled={busy} onClick={()=>submit("Accepted")} className="rounded-xl bg-[#167D73] px-4 py-3 text-xs font-semibold text-white">Accept offer</button><button disabled={busy} onClick={()=>submit("Changes requested")} className="rounded-xl border border-[#DDE5EA] px-4 py-3 text-xs font-medium text-[#526A7D]">Request changes</button><button disabled={busy} onClick={()=>submit("Declined")} className="rounded-xl border border-[#F0D5CF] px-4 py-3 text-xs font-medium text-[#B34E3E]">Decline</button></div></div>
}