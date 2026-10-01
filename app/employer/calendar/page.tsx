"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink,
  Filter, Plus, RefreshCw, Search, UsersRound, X
} from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type View="month"|"week"|"day";
type Interview={id:string;application_id:string|null;status:string|null;confirmed_time:string|null;duration_minutes:number|null;interview_type:string|null;interview_mode:string|null;meeting_link:string|null;meeting_provider:string|null;interviewer_ids:string[]|null;candidate?:Profile;job?:Job;interviewers?:Team[]};
type Profile={id:string;full_name:string|null;email:string|null;current_designation:string|null};
type Job={id:string;title:string;location:string|null;status:string|null;target_start_date:string|null};
type Offer={id:string;application_id:string;start_date:string|null;status:string|null;candidate?:Profile;job?:Job};
type Team={id:string;full_name:string|null;email:string|null;role:string|null};

type Event={
 id:string; date:Date; end?:Date; kind:"Interview"|"Offer"|"Hiring milestone";
 title:string; subtitle:string; href:string; status?:string|null; interview?:Interview; job?:Job;
};

const pad=(n:number)=>String(n).padStart(2,"0");
const key=(d:Date)=>\`\${d.getFullYear()}-\${pad(d.getMonth()+1)}-\${pad(d.getDate())}\`;
const sameDay=(a:Date,b:Date)=>key(a)===key(b);
const startOfWeek=(d:Date)=>{const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x};
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const addMonths=(d:Date,n:number)=>{const x=new Date(d);x.setDate(1);x.setMonth(x.getMonth()+n);return x};
const formatTime=(d:Date)=>d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
const formatLong=(d:Date)=>d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const initials=(v?:string|null)=>(v??"Candidate").split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();

function monthDays(cursor:Date){
 const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);
 const start=startOfWeek(first);
 return Array.from({length:42},(_,i)=>addDays(start,i));
}

export default function CalendarPage(){
 const supabase=createClient();
 const [view,setView]=useState<View>("month");
 const [cursor,setCursor]=useState(new Date());
 const [selectedDate,setSelectedDate]=useState(new Date());
 const [interviews,setInterviews]=useState<Interview[]>([]);
 const [offers,setOffers]=useState<Offer[]>([]);
 const [jobs,setJobs]=useState<Job[]>([]);
 const [team,setTeam]=useState<Team[]>([]);
 const [loading,setLoading]=useState(true);
 const [query,setQuery]=useState("");
 const [kind,setKind]=useState("All");
 const [recruiter,setRecruiter]=useState("All");
 const [detail,setDetail]=useState<Event|null>(null);
 const [notice,setNotice]=useState("");

 async function load(){
   setLoading(true); setNotice("");
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setLoading(false);return}
   const company=await getOrCreateCompanyId(supabase,user);
   const [{data:jd},{data:teamd}]=await Promise.all([
     supabase.from("jobs").select("id,title,location,status,target_start_date").eq("company_id",company).order("created_at",{ascending:false}),
     supabase.from("company_team_members").select("id,full_name,email,role").eq("company_id",company).eq("status","Active").order("full_name")
   ]);
   const jobRows=(jd??[]) as Job[];
   setJobs(jobRows); setTeam((teamd??[]) as Team[]);
   const jobIds=jobRows.map(x=>x.id);
   if(!jobIds.length){setInterviews([]);setOffers([]);setLoading(false);return}
   const {data:apps}=await supabase.from("applications").select("id,user_id,job_id").in("job_id",jobIds);
   const appRows=apps??[]; const appIds=appRows.map(x=>x.id);
   if(!appIds.length){setInterviews([]);setOffers([]);setLoading(false);return}
   const [{data:idata},{data:odata},{data:profiles}]=await Promise.all([
     supabase.from("interview_requests").select("id,application_id,status,confirmed_time,duration_minutes,interview_type,interview_mode,meeting_link,meeting_provider,interviewer_ids").in("application_id",appIds).order("confirmed_time",{ascending:true}),
     supabase.from("offers").select("id,application_id,start_date,status").in("application_id",appIds).order("start_date",{ascending:true}),
     supabase.from("profiles").select("id,full_name,email,current_designation").in("id",appRows.map(x=>x.user_id))
   ]);
   const jm=new Map(jobRows.map(x=>[x.id,x])); const tm=new Map((teamd??[]).map(x=>[x.id,x as Team]));
   const am=new Map(appRows.map(x=>[x.id,x]));
   const pm=new Map((profiles??[]).map(x=>[x.id,x as Profile]));
   setInterviews((idata??[]).map(x=>{
     const a=am.get(x.application_id??"");
     return {...x,candidate:pm.get(a?.user_id??""),job:jm.get(a?.job_id??""),interviewers:(x.interviewer_ids??[]).map((id:string)=>tm.get(id)).filter(Boolean) as Team[]} as Interview
   }).filter(x=>!!x.confirmed_time));
   setOffers((odata??[]).map(x=>{
     const a=am.get(x.application_id);
     return {...x,candidate:pm.get(a?.user_id??""),job:jm.get(a?.job_id??"")} as Offer
   }).filter(x=>!!x.start_date));
   setLoading(false);
 }

 useEffect(()=>{load()},[]); // eslint-disable-line react-hooks/exhaustive-deps

 const events=useMemo<Event[]>(()=>{
   const out:Event[]=[];
   interviews.forEach(i=>{
     const d=new Date(i.confirmed_time!);
     if(Number.isNaN(d.getTime()))return;
     const end=new Date(d.getTime()+(i.duration_minutes??60)*60000);
     out.push({id:"i-"+i.id,date:d,end,kind:"Interview",title:i.candidate?.full_name??"Candidate",subtitle:i.job?.title??"Interview",href:\`/employer/interviews?application=\${i.application_id??""}\`,status:i.status,interview:i,job:i.job});
   });
   offers.forEach(o=>{
     const d=new Date(o.start_date!+"T09:00:00");
     if(Number.isNaN(d.getTime()))return;
     out.push({id:"o-"+o.id,date:d,kind:"Offer",title:o.candidate?.full_name??"Candidate",subtitle:o.job?.title??"Offer start",href:\`/employer/offers?application=\${o.application_id}\`,status:o.status,job:o.job});
   });
   jobs.filter(j=>j.target_start_date).forEach(j=>{
     const d=new Date(j.target_start_date!+"T09:00:00");
     if(Number.isNaN(d.getTime()))return;
     out.push({id:"j-"+j.id,date:d,kind:"Hiring milestone",title:j.title,subtitle:"Target start date",href:\`/employer/jobs/\${j.id}\`,status:j.status,job:j});
   });
   return out.sort((a,b)=>a.date.getTime()-b.date.getTime());
 },[interviews,offers,jobs]);

 const filtered=useMemo(()=>events.filter(e=>{
   const q=query.trim().toLowerCase();
   const matchesQ=!q||[e.title,e.subtitle,e.job?.title,e.job?.location].filter(Boolean).join(" ").toLowerCase().includes(q);
   const matchesKind=kind==="All"||e.kind===kind;
   const ids=e.interview?.interviewer_ids??[];
   const matchesRecruiter=recruiter==="All"||ids.includes(recruiter);
   return matchesQ&&matchesKind&&matchesRecruiter;
 }),[events,query,kind,recruiter]);

 const days=view==="month"?monthDays(cursor):view==="week"?Array.from({length:7},(_,i)=>addDays(startOfWeek(cursor),i)):[selectedDate];
 const rangeTitle=view==="month"?cursor.toLocaleDateString("en-GB",{month:"long",year:"numeric"}):view==="week"?\`\${days[0].toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – \${days[6].toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}\`:formatLong(selectedDate);

 function move(n:number){
   if(view==="month")setCursor(addMonths(cursor,n));
   else {const d=addDays(view==="week"?startOfWeek(cursor):selectedDate,n*(view==="week"?7:1));setCursor(d);setSelectedDate(d)}
 }
 function jumpToday(){const d=new Date();setCursor(d);setSelectedDate(d)}
 const today=new Date();

 const upcoming=filtered.filter(e=>e.date.getTime()>=Date.now()).slice(0,6);
 const selectedEvents=filtered.filter(e=>sameDay(e.date,selectedDate));
 const weekEvents=filtered.filter(e=>days.some(d=>sameDay(d,e.date)));

 return <EmployerShell jobCount={jobs.length}>
  <div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
   <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 sm:py-10">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
     <div><p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73] uppercase">HIRING</p><h1 className="mt-2 font-display text-3xl text-[#173454]">Calendar</h1><p className="mt-2 text-sm text-[#71859A]">One shared schedule for interviews, offers and key hiring milestones.</p></div>
     <div className="flex flex-wrap items-center gap-2">
       <button onClick={jumpToday} className="rounded-xl border border-[#DDE5EA] bg-white px-3 py-2 text-xs font-medium text-[#526A7D]">Today</button>
       <div className="flex overflow-hidden rounded-xl border border-[#DDE5EA] bg-white"><button onClick={()=>move(-1)} className="p-2.5 text-[#71859A] hover:text-[#173454]"><ChevronLeft size={16}/></button><button onClick={()=>move(1)} className="border-l border-[#EEF2F4] p-2.5 text-[#71859A] hover:text-[#173454]"><ChevronRight size={16}/></button></div>
       <div className="flex rounded-xl border border-[#DDE5EA] bg-white p-1">{(["month","week","day"] as View[]).map(v=><button key={v} onClick={()=>setView(v)} className={\`rounded-lg px-3 py-1.5 text-xs font-medium \${view===v?"bg-[#E7F3F1] text-[#167D73]":"text-[#71859A]"}\`}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div>
       <Link href="/employer/interviews" className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white"><Plus size={15}/> Schedule interview</Link>
     </div>
    </div>

    <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
     <section className="min-w-0 rounded-2xl border border-[#DDE5EA] bg-white shadow-[0_2px_12px_rgba(23,52,84,0.025)]">
      <div className="flex flex-col gap-3 border-b border-[#EEF2F4] p-3 lg:flex-row lg:items-center">
       <div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#F7F9F9] px-3"><Search size={15} className="text-[#8A99A5]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search candidate, job or event..." className="w-full bg-transparent text-xs text-[#173454] outline-none placeholder:text-[#9AA8B3]"/></div>
       <div className="flex flex-wrap gap-2">
        <label className="relative"><Filter size={13} className="pointer-events-none absolute left-3 top-3 text-[#8A99A5]"/><select value={kind} onChange={e=>setKind(e.target.value)} className="h-10 appearance-none rounded-xl border border-[#DDE5EA] bg-white pl-8 pr-7 text-xs text-[#526A7D] outline-none"><option>All</option><option>Interview</option><option>Offer</option><option>Hiring milestone</option></select></label>
        <select value={recruiter} onChange={e=>setRecruiter(e.target.value)} className="h-10 max-w-[210px] rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs text-[#526A7D] outline-none"><option value="All">Interviewer</option>{team.map(t=><option key={t.id} value={t.id}>{t.full_name??t.email??"Team member"}</option>)}</select>
        <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs text-[#526A7D]"><RefreshCw size={13}/> Refresh</button>
       </div>
      </div>

      <div className="flex items-center justify-between border-b border-[#EEF2F4] px-5 py-4"><h2 className="text-base font-semibold text-[#173454]">{rangeTitle}</h2><div className="flex items-center gap-3 text-[10px] text-[#8A99A5]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#167D73]"/>Interviews</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#6D78A8]"/>Offers</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#B98B4B]"/>Milestones</span></div></div>

      {loading?<div className="flex min-h-[520px] items-center justify-center text-sm text-[#71859A]">Loading your hiring calendar…</div>:
      view==="month"?<div className="grid grid-cols-7">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} className="border-b border-r border-[#EEF2F4] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#9AA8B3]">{d}</div>)}
        {days.map((d,i)=>{const es=filtered.filter(e=>sameDay(e.date,d));const outside=d.getMonth()!==cursor.getMonth();return <button key={i} onClick={()=>{setSelectedDate(d);setView("day")}} className={\`min-h-[112px] border-b border-r border-[#EEF2F4] p-2 text-left align-top hover:bg-[#FCFDFD] \${outside?"bg-[#FAFBFB]":""}\`}>
          <span className={\`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs \${sameDay(d,today)?"bg-[#173454] font-semibold text-white":"text-[#526A7D]"}\`}>{d.getDate()}</span>
          <div className="mt-1 space-y-1">{es.slice(0,3).map(e=><span key={e.id} onClick={ev=>{ev.stopPropagation();setDetail(e)}} className={\`block truncate rounded-md px-1.5 py-1 text-[10px] font-medium \${e.kind==="Interview"?"bg-[#E7F3F1] text-[#167D73]":e.kind==="Offer"?"bg-[#EEF0F8] text-[#59658F]":"bg-[#F8F1E5] text-[#8A6B35]"}\`}>{e.kind==="Interview"&&formatTime(e.date)+" · "}{e.title}</span>)}</div>
          {es.length>3&&<span className="mt-1 block text-[10px] text-[#9AA8B3]">+{es.length-3} more</span>}
        </button>})}
      </div>:
      <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-7">{days.map((d,i)=>{const es=filtered.filter(e=>sameDay(e.date,d));return <div key={i} className="border-r border-[#EEF2F4] p-3"><div className={\`mb-3 rounded-xl p-2 \${sameDay(d,today)?"bg-[#E7F3F1]":""}\`}><p className="text-[10px] uppercase tracking-[.1em] text-[#8A99A5]">{d.toLocaleDateString("en-GB",{weekday:"short"})}</p><p className="text-lg font-semibold text-[#173454]">{d.getDate()}</p></div><div className="space-y-2">{es.length?es.map(e=><button key={e.id} onClick={()=>setDetail(e)} className="w-full rounded-xl border border-[#DDE5EA] bg-white p-3 text-left hover:border-[#B9DDD7]"><p className="text-[10px] font-semibold text-[#167D73]">{e.kind==="Interview"?formatTime(e.date):"Milestone"}</p><p className="mt-1 text-xs font-medium text-[#173454]">{e.title}</p><p className="mt-1 text-[11px] text-[#71859A]">{e.subtitle}</p></button>):<p className="py-8 text-center text-[11px] text-[#B0BBC3]">No events</p>}</div></div>})}</div>}
     </section>

     <aside className="space-y-5">
      <section className="rounded-2xl border border-[#DDE5EA] bg-white p-5"><p className="text-[10px] font-semibold tracking-[.15em] text-[#167D73] uppercase">UPCOMING</p><h2 className="mt-1 text-base font-semibold text-[#173454]">Next in your hiring schedule</h2><div className="mt-4 space-y-2">{upcoming.length?upcoming.map(e=><button key={e.id} onClick={()=>setDetail(e)} className="w-full rounded-xl border border-[#EEF2F4] p-3 text-left hover:border-[#B9DDD7]"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-[#F7F9F9] p-2 text-[#167D73]"><CalendarDays size={14}/></div><div className="min-w-0"><p className="truncate text-xs font-medium text-[#173454]">{e.title}</p><p className="mt-1 text-[10px] text-[#71859A]">{e.subtitle}</p><p className="mt-1 text-[10px] text-[#9AA8B3]">{e.date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})} · {e.kind==="Interview"?formatTime(e.date):"All day"}</p></div></div></button>):<p className="py-6 text-xs text-[#9AA8B3]">Nothing scheduled yet.</p>}</div></section>
      <section className="rounded-2xl border border-[#DDE5EA] bg-white p-5"><p className="text-[10px] font-semibold tracking-[.15em] text-[#8A99A5] uppercase">CONNECTED WORKSPACES</p><div className="mt-4 space-y-2"><Link href="/employer/interviews" className="flex items-center justify-between rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]"><span className="flex items-center gap-2"><Clock3 size={14} className="text-[#167D73]"/>Interviews</span><ChevronRight/></Link><Link href="/employer/applicants" className="flex items-center justify-between rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]"><span className="flex items-center gap-2"><UsersRound size={14} className="text-[#167D73]"/>Applicants</span><ChevronRight/></Link><Link href="/employer/jobs" className="flex items-center justify-between rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]"><span>Jobs</span><ChevronRight/></Link><Link href="/employer/offers" className="flex items-center justify-between rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]"><span>Offers</span><ChevronRight/></Link></div></section>
     </aside>
    </div>
   </div>
  </div>
  {detail&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173454]/20 p-5" onClick={()=>setDetail(null)}><div className="w-full max-w-lg rounded-2xl border border-[#DDE5EA] bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold tracking-[.14em] text-[#167D73] uppercase">{detail.kind}</p><h2 className="mt-2 text-xl font-semibold text-[#173454]">{detail.title}</h2><p className="mt-1 text-sm text-[#71859A]">{detail.subtitle}</p></div><button onClick={()=>setDetail(null)}><X size={18} className="text-[#8A99A5]"/></button></div><div className="mt-5 space-y-3 text-xs text-[#526A7D]"><div className="flex gap-2"><Clock3 size={14}/>{formatLong(detail.date)}{detail.kind==="Interview"&&\` · \${formatTime(detail.date)} · \${detail.interview?.duration_minutes??60} min\`}</div>{detail.interview?.interview_mode&&<div>Format: {detail.interview.interview_mode}{detail.interview.meeting_provider?\` · \${detail.interview.meeting_provider}\`:\"\"}</div>}{detail.interview?.candidate&&<div>Candidate: <strong>{detail.interview.candidate.full_name}</strong></div>}{detail.interview?.meeting_link&&<a href={detail.interview.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-white">Join meeting <ExternalLink size={13}/></a>}</div><div className="mt-6 flex flex-wrap gap-2"><Link href={detail.href} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs font-medium text-[#526A7D]">Open {detail.kind==="Interview"?"interview":detail.kind==="Offer"?"offer":"job"}</Link>{detail.interview?.candidate&&<Link href={\`/employer/applicants/\${detail.interview.application_id}\`} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs font-medium text-[#526A7D]">Open applicant</Link>}</div></div></div>}
 </EmployerShell>
}