"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UsersRound, MapPin, BriefcaseBusiness, Mail } from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type Candidate = { id:string; full_name:string|null; email:string|null; current_designation:string|null; current_company:string|null; years_experience:string|null; current_location:string|null; professional_summary:string|null; skills:any; availability_status:string|null; notice_period:string|null };
type LinkRow = { user_id:string; job_id:string; job_title:string; company:string; client:string; applied_at:string };

export default function TalentPoolPage() {
 const supabase=createClient();
 const [candidates,setCandidates]=useState<Candidate[]>([]);
 const [links,setLinks]=useState<LinkRow[]>([]);
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState("");
 const [skill,setSkill]=useState("");
 const [message,setMessage]=useState("");
 useEffect(()=>{(async()=>{
  try {
   const {data:{user}}=await supabase.auth.getUser(); if(!user){setLoading(false);return}
   const companyId=await getOrCreateCompanyId(supabase,user);
   const {data:jobs}=await supabase.from("jobs").select("id,title,description,company").eq("company_id",companyId);
   const rows=jobs??[]; const ids=rows.map((j:any)=>j.id);
   if(!ids.length){setLoading(false);return}
   const {data:apps,error}=await supabase.from("applications").select("user_id,job_id,applied_at").in("job_id",ids).order("applied_at",{ascending:false});
   if(error) throw error;
   const userIds=[...new Set((apps??[]).map((a:any)=>a.user_id).filter(Boolean))];
   if(userIds.length){
    const {data:profiles,error:profileError}=await supabase.from("profiles").select("id,full_name,email,current_designation,current_company,years_experience,current_location,professional_summary,skills,availability_status,notice_period").in("id",userIds);
    if(profileError) throw profileError;
    setCandidates((profiles??[]) as Candidate[]);
   }
   const jobMap=Object.fromEntries(rows.map((j:any)=>{let meta:any={};try{meta=JSON.parse(j.description??"")}catch{};return [j.id,{job_title:j.title,company:meta.companyName||j.company||"",client:meta.clientName||""}]]}));
   setLinks((apps??[]).map((a:any)=>({user_id:a.user_id,job_id:a.job_id,applied_at:a.applied_at,...(jobMap[a.job_id]??{job_title:"",company:"",client:""})})));
  } catch(e:any){setMessage(e?.message??"We couldn't load the talent pool. Please try again.");}
  finally{setLoading(false)}
 })()},[]);
 const visible=useMemo(()=>candidates.filter(c=>{
  const hay=[c.full_name,c.email,c.current_designation,c.current_company,c.current_location,c.professional_summary,Array.isArray(c.skills)?c.skills.join(" "):JSON.stringify(c.skills??"")].join(" ").toLowerCase();
  return (!query||hay.includes(query.toLowerCase()))&&(!skill||hay.includes(skill.toLowerCase()));
 }),[candidates,query,skill]);
 function candidateLinks(id:string){return links.filter(l=>l.user_id===id)}
 return <EmployerShell><main className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]"><div className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 sm:py-10">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-[#167D73]">TALENT</p><h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#173454]">Talent Pool</h1><p className="mt-2 max-w-2xl text-[14px] text-[#71859A]">A searchable view of candidates who have applied to your jobs, with their hiring history kept in one place.</p></div><span className="inline-flex items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-4 py-2.5 text-[13px] text-[#607385]"><UsersRound size={16}/>{candidates.length} candidates</span></div>
  <div className="mt-7 grid gap-3 rounded-2xl border border-[#DDE5EA] bg-white p-4 sm:grid-cols-[1fr_240px]"><label className="flex h-11 items-center gap-2 rounded-xl bg-[#F7F9F9] px-3"><Search size={16} className="text-[#8A99A5]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, role, company or location" className="w-full bg-transparent text-[13px] outline-none"/></label><input value={skill} onChange={e=>setSkill(e.target.value)} placeholder="Filter by skill" className="h-11 rounded-xl border border-[#DDE5EA] px-3 text-[13px] outline-none focus:border-[#7DB9B1]"/></div>
  {message&&<p role="alert" className="mt-4 rounded-xl bg-[#FFF4F0] p-3 text-[13px] text-[#9A4D38]">{message}</p>}
  {loading?<div className="mt-6 rounded-2xl border border-[#DDE5EA] bg-white p-12 text-center text-[13px] text-[#71859A]">Loading your talent pool…</div>:visible.length===0?<div className="mt-6 rounded-2xl border border-[#DDE5EA] bg-white p-12 text-center"><UsersRound size={24} className="mx-auto text-[#8A99A5]"/><h2 className="mt-4 text-[16px] font-semibold text-[#173454]">{candidates.length===0?"Your talent pool will grow here":"No matching candidates"}</h2><p className="mx-auto mt-2 max-w-lg text-[13px] text-[#71859A]">{candidates.length===0?"Candidates who apply to jobs in your HRANITI workspace will appear here automatically. You can search and reuse this talent across future openings.":"Try a different name, role or skill."}</p></div>:<div className="mt-5 grid gap-3">{visible.map(c=>{const history=candidateLinks(c.id);const skills=Array.isArray(c.skills)?c.skills:typeof c.skills==="string"?c.skills.split(",").map((x:string)=>x.trim()):[];return <article key={c.id} className="rounded-2xl border border-[#DDE5EA] bg-white p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E7F3F1] text-[13px] font-semibold text-[#167D73]">{(c.full_name||"C").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div className="min-w-0"><h2 className="font-semibold text-[#173454]">{c.full_name||"Candidate"}</h2><p className="mt-1 text-[13px] text-[#607385]">{c.current_designation||"Role not specified"}{c.current_company?" · "+c.current_company:""}</p><div className="mt-2 flex flex-wrap gap-3 text-[12px] text-[#8A99A5]">{c.current_location&&<span className="inline-flex items-center gap-1"><MapPin size={13}/>{c.current_location}</span>}{c.years_experience&&<span>{c.years_experience} experience</span>}{c.notice_period&&<span>{c.notice_period} notice</span>}</div></div></div>{c.email&&<a href={"mailto:"+c.email} className="inline-flex items-center gap-2 self-start rounded-lg border border-[#DDE5EA] px-3 py-2 text-[12px] text-[#167D73]"><Mail size={14}/>Contact</a>}</div>{c.professional_summary&&<p className="mt-4 text-[13px] leading-6 text-[#607385]">{c.professional_summary}</p>}{skills.length>0&&<div className="mt-4 flex flex-wrap gap-2">{skills.slice(0,10).map((s:any,i:number)=><span key={String(s)+i} className="rounded-full bg-[#F2F6F5] px-3 py-1 text-[11px] text-[#426B68]">{String(s)}</span>)}</div>}{history.length>0&&<div className="mt-4 border-t border-[#EEF2F4] pt-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A99A5]">Hiring history in your workspace</p><div className="flex flex-wrap gap-2">{history.map((h,i)=><span key={h.job_id+i} className="rounded-lg bg-[#F7F9F9] px-3 py-2 text-[11px] text-[#607385]"><BriefcaseBusiness size={12} className="mr-1 inline"/>{h.job_title}{h.client?" · Client: "+h.client:""}{h.company?" · "+h.company:""}</span>)}</div></div>}</article>})}</div>}
 </div></main></EmployerShell>
}