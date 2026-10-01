"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";

type Criterion={name:string;description?:string;scale?:number};
type InviteData={
  invitation:{name:string|null;email:string;role:string|null;status:string;expires_at:string};
  interview:{confirmed_time:string|null;duration_minutes:number|null;timezone:string|null;meeting_link:string|null;meeting_provider:string|null;interview_type:string|null;interview_mode:string|null;scorecard_criteria:Criterion[]|null;status:string|null};
  candidate:{full_name:string};
  job:{title:string};
};

const endpoint=()=>process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/interview-invitations";

export default function InterviewInvitePage(){
  const [token,setToken]=useState("");
  const [data,setData]=useState<InviteData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [ratings,setRatings]=useState<Record<string,number>>({});
  const [recommendation,setRecommendation]=useState("");
  const [strengths,setStrengths]=useState("");
  const [concerns,setConcerns]=useState("");
  const [notes,setNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [submitted,setSubmitted]=useState(false);

  useEffect(()=>{
    const t=new URLSearchParams(window.location.search).get("token")||"";
    setToken(t);
    if(!t){setError("This invitation link is missing its secure token.");setLoading(false);return;}
    fetch(endpoint(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"open",token:t})})
      .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Invitation could not be opened");return j})
      .then(j=>{setData(j);const next:Record<string,number>={};(j.interview.scorecard_criteria||[]).forEach((c:Criterion)=>next[c.name]=0);setRatings(next);})
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[]);

  const criteria=useMemo(()=>data?.interview.scorecard_criteria||[],[data]);

  async function submit(){
    if(!data)return;
    if(criteria.some(c=>(ratings[c.name]||0)<1)){setError("Please score every criterion before submitting.");return;}
    if(!recommendation){setError("Please select an overall recommendation.");return;}
    setSaving(true);setError("");
    const r=await fetch(endpoint(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit_feedback",token,ratings,recommendation,strengths,concerns,notes})});
    const j=await r.json();
    if(!r.ok)setError(j.error||"Feedback could not be submitted");else setSubmitted(true);
    setSaving(false);
  }

  const when=data?.interview.confirmed_time?new Date(data.interview.confirmed_time).toLocaleString("en-GB",{dateStyle:"full",timeStyle:"short"}):"Time to be confirmed";

  if(loading)return <main className="min-h-screen bg-[#FCFCFA] flex items-center justify-center text-sm text-[#71859A]">Opening your secure interview workspace…</main>;
  if(error&&!data)return <main className="min-h-screen bg-[#FCFCFA] px-5 py-16"><div className="mx-auto max-w-[620px] rounded-2xl border border-[#DDE5EA] bg-white p-8"><p className="text-[10px] font-semibold tracking-[0.18em] text-[#B34E3E] uppercase">HRANITI · INTERVIEW</p><h1 className="mt-2 text-2xl font-semibold text-[#173454]">Invitation unavailable</h1><p className="mt-3 text-sm text-[#71859A]">{error}</p></div></main>;
  if(submitted)return <main className="min-h-screen bg-[#FCFCFA] px-5 py-16"><div className="mx-auto max-w-[620px] rounded-2xl border border-[#DDE5EA] bg-white p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F3F1] text-[#167D73]"><CheckCircle2/></div><h1 className="mt-5 text-2xl font-semibold text-[#173454]">Feedback submitted</h1><p className="mt-2 text-sm text-[#71859A]">Thank you. Your feedback has been securely recorded for the hiring team.</p></div></main>;

  return <main className="min-h-screen bg-[#FCFCFA] text-[#173454]">
    <div className="mx-auto max-w-[940px] px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold tracking-[0.2em] text-[#167D73] uppercase">HRANITI · INTERVIEW WORKSPACE</p><h1 className="mt-2 text-2xl font-semibold">Structured interview feedback</h1></div><div className="flex items-center gap-2 rounded-full border border-[#DDE5EA] bg-white px-3 py-2 text-[10px] text-[#526A7D]"><ShieldCheck size={14} className="text-[#167D73]"/> Secure invitation</div></div>
      <div className="mt-7 grid gap-4 md:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 shadow-[0_14px_40px_rgba(23,52,84,0.05)]">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[#8A99A5] uppercase">Candidate</p><h2 className="mt-2 text-xl font-semibold">{data?.candidate.full_name}</h2><p className="mt-1 text-sm text-[#71859A]">{data?.job.title}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F8FBFA] p-4"><p className="text-[10px] uppercase tracking-[.1em] text-[#8A99A5]">When</p><p className="mt-1 text-sm font-medium">{when}</p><p className="mt-1 text-[11px] text-[#71859A]">{data?.interview.duration_minutes||60} min · {data?.interview.timezone||"Local time"}</p></div>
            <div className="rounded-xl bg-[#F8FBFA] p-4"><p className="text-[10px] uppercase tracking-[.1em] text-[#8A99A5]">Format</p><p className="mt-1 text-sm font-medium">{data?.interview.interview_type||"Interview"}</p><p className="mt-1 text-[11px] text-[#71859A]">{data?.interview.interview_mode||"Online"}{data?.interview.meeting_provider?" · "+data.interview.meeting_provider:""}</p></div>
          </div>
          {data?.interview.meeting_link&&<a href={data.interview.meeting_link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white">Join meeting <ExternalLink size={13}/></a>}
        </section>
        <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6"><p className="text-[10px] font-semibold tracking-[0.12em] text-[#8A99A5] uppercase">Your invitation</p><p className="mt-2 text-sm font-medium">{data?.invitation.name||data?.invitation.email}</p><p className="mt-1 text-xs text-[#71859A]">{data?.invitation.role||"Interviewer"}</p><div className="mt-5 flex items-center gap-2 text-xs text-[#526A7D]"><Clock3 size={14}/><span>Invitation expires {new Date(data!.invitation.expires_at).toLocaleDateString("en-GB")}</span></div><p className="mt-4 text-[11px] leading-5 text-[#71859A]">Use this workspace to capture evidence against the agreed scorecard. Your feedback is visible to the hiring team.</p></section>
      </div>
      <section className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-8">
        <div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold tracking-[0.12em] text-[#167D73] uppercase">SCORECARD</p><h2 className="mt-1 text-lg font-semibold">Rate each criterion</h2><p className="mt-1 text-xs text-[#71859A]">Use 1–5 and base ratings on evidence from the interview.</p></div><FileCheck2 size={20} className="text-[#167D73]"/></div>
        <div className="mt-6 space-y-3">{criteria.map(c=><div key={c.name} className="rounded-xl border border-[#DDE5EA] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{c.name}</p><p className="mt-1 text-xs text-[#71859A]">{c.description}</p></div><div className="flex gap-1.5">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRatings(v=>({...v,[c.name]:n}))} className={ "h-9 w-9 rounded-lg border text-xs " + ((ratings[c.name]||0)>=n?"border-[#B9DDD7] bg-[#E7F3F1] text-[#167D73]":"border-[#DDE5EA] bg-white text-[#8A99A5]")}>{n}</button>)}</div></div></div>)}</div>
        <div className="mt-7 grid gap-5">
          <label><span className="label">Overall recommendation</span><select value={recommendation} onChange={e=>setRecommendation(e.target.value)} className="input"><option value="">Select recommendation…</option><option>Strong hire</option><option>Hire</option><option>Hold</option><option>No hire</option></select></label>
          <label><span className="label">Strengths & evidence</span><textarea value={strengths} onChange={e=>setStrengths(e.target.value)} className="input min-h-[110px]" placeholder="What evidence supports the rating?"/></label>
          <label><span className="label">Concerns / follow-up</span><textarea value={concerns} onChange={e=>setConcerns(e.target.value)} className="input min-h-[110px]" placeholder="Risks, gaps or questions to follow up…"/></label>
          <label><span className="label">Additional notes</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} className="input min-h-[90px]" placeholder="Optional private notes for the hiring team…"/></label>
        </div>
        {error&&<p className="mt-4 rounded-xl bg-[#FFF8E8] px-3 py-2.5 text-xs text-[#9A6A19]">{error}</p>}
        <div className="mt-6 flex justify-end"><button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-5 py-3 text-xs font-medium text-white disabled:opacity-50">{saving?"Submitting…":"Submit feedback"} <CheckCircle2 size={14}/></button></div>
      </section>
      <p className="mt-5 text-center text-[10px] text-[#9AA8B3]">HRaniti · Better talent. Brighter futures.</p>
    </div>
    <style jsx global>{".label{display:block;font-size:11px;font-weight:500;color:#526A7D}.input{margin-top:6px;width:100%;border:1px solid #DDE5EA;border-radius:12px;background:#fff;padding:11px 12px;font-size:12px;color:#173454;outline:none}.input:focus{border-color:#A9D4CE}"}</style>
  </main>;
}