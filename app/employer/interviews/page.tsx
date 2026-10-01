"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays, CheckCircle2, ChevronRight, Clock3, ExternalLink, FileCheck2,
  Link2, Plus, RefreshCw, UserRound, Video, X, XCircle
} from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type Interview = {
  id: string;
  application_id: string | null;
  status: string | null;
  proposed_times: string[] | null;
  confirmed_time: string | null;
  requested_by: string | null;
  created_at: string | null;
  interview_type: string | null;
  interview_mode: string | null;
  duration_minutes: number | null;
  timezone: string | null;
  meeting_link: string | null;
  meeting_provider: string | null;
  calendar_provider: string | null;
  calendar_event_id: string | null;
  interviewer_ids: string[] | null;
  scorecard_id: string | null;
  reminder_minutes: number[] | null;
  candidate_confirmed_at: string | null;
  candidate_response: string | null;
  notes: string | null;
};

type Application = { id:string; user_id:string; job_id:string; status:string|null; pipeline_stage:string|null; applied_at:string };
type Candidate = { id:string; full_name:string|null; email:string|null; current_designation:string|null };
type Job = { id:string; title:string; location:string|null };
type TeamMember = { id:string; user_id:string|null; full_name:string|null; email:string|null; role:string|null; status:string|null };
type Scorecard = { id:string; name:string; description:string|null; interview_type:string|null; criteria:any[]; is_active:boolean|null };
type Row = Interview & { application?:Application; candidate?:Candidate; job?:Job; interviewers?:TeamMember[]; scorecard?:Scorecard };
type ApplicationChoice = Application & { candidate?:Candidate; job?:Job };
type Filter = "Upcoming"|"Requests"|"Completed"|"All";

const formatDateTime=(value?:string|null)=>{
  if(!value)return "Time to be arranged";
  const d=new Date(value); if(Number.isNaN(d.getTime()))return value;
  return d.toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"});
};
const formatDate=(value?:string|null)=>{
  if(!value)return "—"; const d=new Date(value); if(Number.isNaN(d.getTime()))return "—";
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
};
const initials=(value?:string|null)=>(value??"Candidate").split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const statusTone=(status?:string|null)=>{
  const s=(status??"").toLowerCase();
  if(s==="confirmed")return "bg-[#E7F3F1] text-[#167D73]";
  if(s==="completed")return "bg-[#F1F4F4] text-[#526A7D]";
  if(["cancelled","declined"].includes(s))return "bg-[#FFF4F1] text-[#B34E3E]";
  return "bg-[#FFF8E8] text-[#9A6A19]";
};
const isFuture=(row:Row)=>{
  const value=row.confirmed_time??row.proposed_times?.[0]; if(!value)return false;
  const d=new Date(value); return !Number.isNaN(d.getTime())&&d.getTime()>=Date.now();
};
const defaultCriteria=[
  {name:"Role knowledge",description:"Understanding of the role and relevant expertise",scale:5},
  {name:"Problem solving",description:"Approach to practical problems and ambiguity",scale:5},
  {name:"Communication",description:"Clarity, listening and stakeholder communication",scale:5},
  {name:"Collaboration",description:"Works effectively with others",scale:5},
];

export default function InterviewsPage(){
  const supabase=createClient();
  const [rows,setRows]=useState<Row[]>([]);
  const [applicationChoices,setApplicationChoices]=useState<ApplicationChoice[]>([]);
  const [members,setMembers]=useState<TeamMember[]>([]);
  const [scorecards,setScorecards]=useState<Scorecard[]>([]);
  const [loading,setLoading]=useState(true);
  const [filter,setFilter]=useState<Filter>("Upcoming");
  const [query,setQuery]=useState("");
  const [showNew,setShowNew]=useState(false);
  const [detail,setDetail]=useState<Row|null>(null);
  const [feedback,setFeedback]=useState<Row|null>(null);
  const [applicationId,setApplicationId]=useState("");
  const [dateValue,setDateValue]=useState("");
  const [timeValue,setTimeValue]=useState("");
  const [duration,setDuration]=useState("60");
  const [interviewType,setInterviewType]=useState("Structured interview");
  const [mode,setMode]=useState("Online");
  const [timezone,setTimezone]=useState("Asia/Kolkata");
  const [meetingLink,setMeetingLink]=useState("");
  const [meetingProvider,setMeetingProvider]=useState("Google Meet");
  const [selectedInterviewers,setSelectedInterviewers]=useState<string[]>([]);
  const [showInterviewerPicker,setShowInterviewerPicker]=useState(false);
  const [externalInterviewer,setExternalInterviewer]=useState({name:"",email:"",role:""});
  const [scorecardId,setScorecardId]=useState("");
  const [reminders,setReminders]=useState<number[]>([1440,60]);
  const [notes,setNotes]=useState("");
  const [feedbackRatings,setFeedbackRatings]=useState<Record<string,number>>({});
  const [recommendation,setRecommendation]=useState("");
  const [strengths,setStrengths]=useState("");
  const [concerns,setConcerns]=useState("");
  const [feedbackNotes,setFeedbackNotes]=useState("");
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");

  async function load(){
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setRows([]);setLoading(false);return;}
    const company=await getOrCreateCompanyId(supabase,user);
    const [{data:jobs},{data:team},{data:cards}]=await Promise.all([
      supabase.from("jobs").select("id,title,location").eq("company_id",company).order("created_at",{ascending:false}),
      supabase.from("company_team_members").select("id,user_id,full_name,email,role,status").eq("company_id",company).eq("status","Active").order("full_name"),
      supabase.from("interview_scorecards").select("id,name,description,interview_type,criteria,is_active").eq("company_id",company).eq("is_active",true).order("created_at"),
    ]);
    setMembers((team??[]) as TeamMember[]);
    let cardsData=(cards??[]) as Scorecard[];
    if(!cardsData.length){
      const {data:created}=await supabase.from("interview_scorecards").insert({company_id:company,name:"General Interview Scorecard",description:"A reusable core scorecard for structured interviews.",interview_type:"General",criteria:defaultCriteria,created_by:user.id}).select("id,name,description,interview_type,criteria,is_active").single();
      if(created)cardsData=[created as Scorecard];
    }
    setScorecards(cardsData);
    if(!scorecardId&&cardsData[0])setScorecardId(cardsData[0].id);
    const jobIds=(jobs??[]).map(x=>x.id);
    if(!jobIds.length){setRows([]);setLoading(false);return;}
    const {data:apps}=await supabase.from("applications").select("id,user_id,job_id,status,pipeline_stage,applied_at").in("job_id",jobIds).order("applied_at",{ascending:false});
    const appIds=(apps??[]).map(x=>x.id);
    if(!appIds.length){setRows([]);setLoading(false);return;}
    const [{data:interviews},{data:profiles}]=await Promise.all([
      supabase.from("interview_requests").select("id,application_id,status,proposed_times,confirmed_time,requested_by,created_at,interview_type,interview_mode,duration_minutes,timezone,meeting_link,meeting_provider,calendar_provider,calendar_event_id,interviewer_ids,scorecard_id,reminder_minutes,candidate_confirmed_at,candidate_response,notes").in("application_id",appIds).order("created_at",{ascending:false}),
      supabase.from("profiles").select("id,full_name,email,current_designation").in("id",[...new Set((apps??[]).map(x=>x.user_id))]),
    ]);
    const appMap=new Map((apps??[]).map(x=>[x.id,x as Application]));
    const jobMap=new Map((jobs??[]).map(x=>[x.id,x as Job]));
    const profileMap=new Map((profiles??[]).map(x=>[x.id,x as Candidate]));
    const memberMap=new Map((team??[]).map(x=>[x.id,x as TeamMember]));
    const cardMap=new Map(cardsData.map(x=>[x.id,x]));
    setApplicationChoices((apps??[]).map(x=>({...x as Application,candidate:profileMap.get(x.user_id),job:jobMap.get(x.job_id)})));
    setRows((interviews??[]).map(x=>{
      const interview=x as Interview; const app=appMap.get(x.application_id??"");
      return {...interview,application:app,job:jobMap.get(app?.job_id??""),candidate:profileMap.get(app?.user_id??""),interviewers:(interview.interviewer_ids??[]).map(id=>memberMap.get(id)).filter(Boolean) as TeamMember[],scorecard:cardMap.get(interview.scorecard_id??"")};
    }));
    setLoading(false);
  }
  useEffect(()=>{load();},[]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const requested=new URLSearchParams(window.location.search).get("application");if(requested){setApplicationId(requested);setShowNew(true);}},[]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return rows.filter(row=>{
      const s=(row.status??"Requested").toLowerCase();
      const matches=filter==="All"||(filter==="Upcoming"?(s==="confirmed"?isFuture(row):!["completed","cancelled","declined"].includes(s)):filter==="Requests"&&!["confirmed","completed","cancelled","declined"].includes(s))||(filter==="Completed"&&s==="completed");
      const hay=[row.candidate?.full_name,row.candidate?.email,row.job?.title,row.application?.pipeline_stage,row.status,row.interview_type,row.interview_mode].filter(Boolean).join(" ").toLowerCase();
      return matches&&(!q||hay.includes(q));
    });
  },[rows,filter,query]);
  const counts=useMemo(()=>({
    upcoming:rows.filter(r=>{const s=(r.status??"Requested").toLowerCase();return s==="confirmed"?isFuture(r):!["completed","cancelled","declined"].includes(s)}).length,
    requests:rows.filter(r=>!["confirmed","completed","cancelled","declined"].includes((r.status??"Requested").toLowerCase())).length,
    completed:rows.filter(r=>(r.status??"").toLowerCase()==="completed").length,
  }),[rows]);
  const applicationOptions=applicationChoices.filter(x=>!["rejected","withdrawn","hired"].includes((x.status??"").toLowerCase()));

  function resetForm(){
    setApplicationId("");setDateValue("");setTimeValue("");setDuration("60");setInterviewType("Structured interview");setMode("Online");setTimezone("Asia/Kolkata");setMeetingLink("");setMeetingProvider("Google Meet");setSelectedInterviewers([]);setShowInterviewerPicker(false);setExternalInterviewer({name:"",email:"",role:""});setScorecardId(scorecards[0]?.id??"");setReminders([1440,60]);setNotes("");setNotice("");
  }
  async function createInterview(){
    if(!applicationId||!dateValue||!timeValue){setNotice("Choose a candidate, date and time.");return;}
    setSaving(true);setNotice("");
    const {data:{user}}=await supabase.auth.getUser(); if(!user){setNotice("Please sign in again.");setSaving(false);return;}
    const proposed=new Date(dateValue+"T"+timeValue);
    const {error}=await supabase.from("interview_requests").insert({
      application_id:applicationId,status:"Requested",proposed_times:[proposed.toISOString()],requested_by:user.id,
      interview_type:interviewType,interview_mode:mode,duration_minutes:Number(duration),timezone,
      meeting_link:meetingLink||null,meeting_provider:mode==="Online"?meetingProvider:null,
      interviewer_ids:selectedInterviewers,scorecard_id:scorecardId||null,reminder_minutes:reminders,notes:notes||null
    });
    if(error)setNotice(error.message);else{setShowNew(false);resetForm();await load();}
    setSaving(false);
  }
  async function confirmInterview(row:Row,time:string){
    const {error}=await supabase.from("interview_requests").update({status:"Confirmed",confirmed_time:time}).eq("id",row.id);
    if(!error)await load();
  }
  async function setStatus(row:Row,status:string){const {error}=await supabase.from("interview_requests").update({status}).eq("id",row.id);if(!error)await load();}
  function addToCalendar(row:Row){
    const start=row.confirmed_time?new Date(row.confirmed_time):null;if(!start)return;
    const end=new Date(start.getTime()+(row.duration_minutes??60)*60000);
    const pad=(n:number)=>String(n).padStart(2,"0");
    const utc=(d:Date)=>d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+"T"+pad(d.getUTCHours())+pad(d.getUTCMinutes())+"00Z";
    const title=encodeURIComponent((row.interview_type??"Interview")+" — "+(row.candidate?.full_name??"Candidate")+" — "+(row.job?.title??""));
    const details=encodeURIComponent([row.meeting_link?"Meeting: "+row.meeting_link:"",row.notes??""].filter(Boolean).join("\n"));
    window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text="+title+"&dates="+utc(start)+"/"+utc(end)+"&details="+details,"_blank","noopener,noreferrer");
  }
  function downloadIcs(row:Row){
    if(!row.confirmed_time)return;
    const start=new Date(row.confirmed_time),end=new Date(start.getTime()+(row.duration_minutes??60)*60000);
    const utc=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
    const body=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//HRaniti//Interview//EN","BEGIN:VEVENT","UID:"+row.id+"@hraniti.com","DTSTAMP:"+utc(new Date()),"DTSTART:"+utc(start),"DTEND:"+utc(end),"SUMMARY:"+((row.interview_type??"Interview")+" — "+(row.candidate?.full_name??"Candidate")).replace(/[,;]/g,"\\$&"),"DESCRIPTION:"+((row.meeting_link??"")+" "+(row.notes??"")).replace(/[\r\n]/g," ").replace(/[,;]/g,"\\$&"),"END:VEVENT","END:VCALENDAR"].join("\r\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([body],{type:"text/calendar"}));a.download="hraniti-interview-"+row.id+".ics";a.click();URL.revokeObjectURL(a.href);
  }
  function openFeedback(row:Row){
    setFeedback(row);
    const first=scorecards.find(x=>x.id===row.scorecard_id)||row.scorecard||scorecards[0];
    const ratings:Record<string,number>={};(first?.criteria??[]).forEach((c:any)=>{ratings[c.name]=0});setFeedbackRatings(ratings);setRecommendation("");setStrengths("");setConcerns("");setFeedbackNotes("");
  }
  async function saveFeedback(){
    if(!feedback)return;setSaving(true);setNotice("");
    const {data:{user}}=await supabase.auth.getUser();if(!user){setSaving(false);return;}
    const company=await getOrCreateCompanyId(supabase,user);
    const interviewerId=members.find(m=>m.user_id===user.id)?.id??members.find(m=>m.id===user.id)?.id??null;
    const {error}=await supabase.from("interview_feedback").insert({interview_id:feedback.id,company_id:company,interviewer_id:interviewerId,ratings:feedbackRatings,overall_recommendation:recommendation||null,strengths:strengths||null,concerns:concerns||null,notes:feedbackNotes||null});
    if(!error){await supabase.from("interview_requests").update({status:"Completed"}).eq("id",feedback.id);setFeedback(null);await load();}else setNotice(error.message);
    setSaving(false);
  }
  const selectedCard=feedback?(scorecards.find(x=>x.id===feedback.scorecard_id)||feedback.scorecard||scorecards[0]):null;

  return <EmployerShell><div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
    <div className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73] uppercase">HIRING</p><h1 className="mt-2 font-display text-3xl text-[#173454]">Interviews</h1><p className="mt-1 max-w-2xl text-sm text-[#71859A]">Schedule, coordinate and capture structured interview decisions in one place.</p></div>
        <button onClick={()=>{resetForm();setShowNew(true)}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#126A62]"><Plus size={15}/> Schedule interview</button>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {[["Upcoming",counts.upcoming,"Confirmed interviews and open scheduling requests"],["Requests",counts.requests,"Interviews waiting for confirmation"],["Completed",counts.completed,"Interviews with feedback history"]].map(([label,value,desc])=><button key={String(label)} onClick={()=>setFilter(label as Filter)} className={"rounded-2xl border bg-white p-5 text-left transition "+(filter===label?"border-[#B9DDD7] shadow-[0_5px_18px_rgba(23,52,84,0.05)]":"border-[#DDE5EA] hover:border-[#C9D8DE]")}><p className="text-[10px] font-semibold tracking-[0.12em] text-[#8A99A5] uppercase">{label}</p><p className="mt-2 text-2xl font-semibold text-[#173454]">{value}</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">{desc}</p></button>)}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search candidate, job or interview type…" className="h-11 flex-1 rounded-xl border border-[#DDE5EA] bg-white px-4 text-xs text-[#173454] outline-none focus:border-[#A9D4CE]"/><button onClick={()=>setFilter("All")} className={"h-11 rounded-xl border px-4 text-xs "+(filter==="All"?"border-[#B9DDD7] bg-[#E7F3F1] text-[#167D73]":"border-[#DDE5EA] bg-white text-[#526A7D]")}>All interviews</button><button onClick={load} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-4 text-xs text-[#526A7D]"><RefreshCw size={14}/> Refresh</button></div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white">
        {loading?<div className="px-6 py-16 text-center text-sm text-[#71859A]">Loading interviews…</div>:filtered.length===0?<div className="px-6 py-16 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#E7F3F1] text-[#167D73]"><CalendarDays size={20}/></span><p className="mt-4 text-sm font-medium text-[#173454]">No interviews in this view</p><p className="mt-1 text-xs text-[#71859A]">Schedule an interview from a candidate or use the button above.</p></div>:<div className="divide-y divide-[#EEF2F4]">{filtered.map(row=><div key={row.id} className="px-5 py-5 sm:px-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7F3F1] text-[11px] font-semibold text-[#167D73]">{initials(row.candidate?.full_name)}</span><div className="min-w-0"><button onClick={()=>setDetail(row)} className="text-left text-sm font-semibold text-[#173454] hover:text-[#167D73]">{row.candidate?.full_name??"Candidate"}</button><p className="mt-0.5 truncate text-xs text-[#71859A]">{row.candidate?.current_designation??"Applicant"} · {row.job?.title??"Job"}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#71859A]"><span className={"rounded-full px-2.5 py-1 font-medium "+statusTone(row.status)}>{row.status??"Requested"}</span><span>{row.interview_type??"Interview"}</span><span>·</span><span>{row.interview_mode??"Online"}</span></div></div></div>
          <div className="min-w-[220px]"><p className="text-[10px] font-semibold tracking-[0.1em] text-[#8A99A5] uppercase">Interview time</p><p className="mt-1 flex items-center gap-2 text-xs text-[#526A7D]"><Clock3 size={13}/>{formatDateTime(row.confirmed_time??row.proposed_times?.[0])}</p><p className="mt-1 text-[10px] text-[#9AA8B3]">{row.duration_minutes??60} min · {row.timezone??"Local time"}</p></div>
          <div className="min-w-[190px]"><p className="text-[10px] font-semibold tracking-[0.1em] text-[#8A99A5] uppercase">Interviewers</p><p className="mt-1 text-xs text-[#526A7D]">{row.interviewers?.length?row.interviewers.map(x=>x.full_name||x.email).filter(Boolean).join(", "):"Not assigned"}</p><p className="mt-1 text-[10px] text-[#9AA8B3]">{row.scorecard?.name??"No scorecard"}</p></div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            {row.status==="Requested"&&row.proposed_times?.[0]&&<button onClick={()=>confirmInterview(row,row.proposed_times![0])} className="inline-flex items-center gap-1.5 rounded-xl bg-[#167D73] px-3 py-2 text-[11px] font-medium text-white"><CheckCircle2 size={13}/> Confirm</button>}
            {row.status==="Confirmed"&&<button onClick={()=>openFeedback(row)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#B9DDD7] bg-[#E7F3F1] px-3 py-2 text-[11px] font-medium text-[#167D73]"><FileCheck2 size={13}/> Interview feedback</button>}
            {row.status==="Confirmed"&&<button onClick={()=>addToCalendar(row)} className="rounded-xl border border-[#DDE5EA] bg-white px-3 py-2 text-[11px] text-[#526A7D]">Google Calendar</button>}
            {row.status==="Confirmed"&&<button onClick={()=>downloadIcs(row)} className="rounded-xl border border-[#DDE5EA] bg-white px-3 py-2 text-[11px] text-[#526A7D]">.ics</button>}
            {!["Completed","Cancelled"].includes(row.status??"")&&<button onClick={()=>setStatus(row,"Cancelled")} className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0D5CF] bg-white px-3 py-2 text-[11px] text-[#B34E3E]"><XCircle size={13}/> Cancel</button>}
            <button onClick={()=>setDetail(row)} className="inline-flex items-center gap-1 text-[11px] text-[#167D73]">Details <ChevronRight size={13}/></button>
          </div>
        </div></div>)}</div>}
      </div>
    </div>

    {showNew&&<div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 px-5 py-8"><div className="mx-auto w-full max-w-[720px] rounded-2xl border border-[#DDE5EA] bg-white p-6 shadow-[0_24px_70px_rgba(23,52,84,0.18)] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold tracking-[0.15em] text-[#167D73] uppercase">INTERVIEW</p><h2 className="mt-1 text-lg font-semibold text-[#173454]">Schedule interview</h2><p className="mt-1 text-xs text-[#71859A]">Set the interview logistics before inviting the candidate.</p></div><button onClick={()=>setShowNew(false)}><X size={18} className="text-[#71859A]"/></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">Candidate application</span><select value={applicationId} onChange={e=>setApplicationId(e.target.value)} className="input"><option value="">Select candidate…</option>{applicationOptions.map(a=><option key={a.id} value={a.id}>{a.candidate?.full_name??"Candidate"} · {a.job?.title??"Job"}</option>)}</select></label>
        <label><span className="label">Interview type</span><select value={interviewType} onChange={e=>setInterviewType(e.target.value)} className="input"><option>Structured interview</option><option>Recruiter screen</option><option>Technical interview</option><option>Hiring manager interview</option><option>Panel interview</option><option>Executive interview</option><option>Case study</option><option>Other</option></select></label>
        <label><span className="label">Mode</span><select value={mode} onChange={e=>setMode(e.target.value)} className="input"><option>Online</option><option>In person</option><option>Phone</option></select></label>
        <label><span className="label">Date</span><input type="date" value={dateValue} onChange={e=>setDateValue(e.target.value)} className="input"/></label>
        <label><span className="label">Time</span><input type="time" value={timeValue} onChange={e=>setTimeValue(e.target.value)} className="input"/></label>
        <label><span className="label">Duration</span><select value={duration} onChange={e=>setDuration(e.target.value)} className="input"><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">2 hours</option></select></label>
        <label><span className="label">Timezone</span><select value={timezone} onChange={e=>setTimezone(e.target.value)} className="input"><option>Asia/Kolkata</option><option>Asia/Dubai</option><option>Asia/Singapore</option><option>Europe/London</option><option>Europe/Stockholm</option><option>Europe/Berlin</option><option>America/New_York</option><option>America/Los_Angeles</option><option>UTC</option></select></label>
        <div className="sm:col-span-2"><div className="flex items-center justify-between"><span className="label">Interviewers</span><button type="button" onClick={()=>setShowInterviewerPicker(v=>!v)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#B9DDD7] bg-[#E7F3F1] px-2.5 py-1.5 text-[11px] font-medium text-[#167D73]">+ Add interviewer</button></div><div className="mt-2 flex flex-wrap gap-2">{selectedInterviewers.map(id=>{const m=members.find(x=>x.id===id);return <span key={id} className="inline-flex items-center gap-2 rounded-full border border-[#B9DDD7] bg-[#E7F3F1] px-3 py-1.5 text-[11px] text-[#167D73]">{m?.full_name||m?.email||"Interviewer"}<button type="button" onClick={()=>setSelectedInterviewers(v=>v.filter(x=>x!==id))} aria-label="Remove interviewer">×</button></span>})}{!selectedInterviewers.length&&<span className="text-xs text-[#9AA8B3]">No interviewers assigned yet.</span>}</div>{showInterviewerPicker&&<div className="mt-3 rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-xs font-medium text-[#173454]">Add from your team</p><p className="mt-1 text-[11px] text-[#71859A]">Select one or more existing team members. You can add several interviewers.</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{members.map(m=><button type="button" key={m.id} onClick={()=>setSelectedInterviewers(v=>v.includes(m.id)?v.filter(x=>x!==m.id):[...v,m.id])} className={"rounded-xl border bg-white p-3 text-left "+(selectedInterviewers.includes(m.id)?"border-[#B9DDD7] bg-[#E7F3F1]":"border-[#DDE5EA]")}><p className="text-xs font-medium text-[#173454]">{m.full_name||"Team member"}</p><p className="mt-0.5 text-[10px] text-[#71859A]">{m.email||"No email"} · {m.role||"Team member"}</p></button>)}</div><div className="mt-4 border-t border-[#DDE5EA] pt-4"><p className="text-xs font-medium text-[#173454]">External interviewer</p><p className="mt-1 text-[11px] text-[#71859A]">For a client, SME or guest who is not in your HRaniti team.</p><div className="mt-2 grid gap-2 sm:grid-cols-3"><input value={externalInterviewer.name} onChange={e=>setExternalInterviewer(v=>({...v,name:e.target.value}))} placeholder="Name" className="input"/><input value={externalInterviewer.email} onChange={e=>setExternalInterviewer(v=>({...v,email:e.target.value}))} placeholder="Email" className="input"/><input value={externalInterviewer.role} onChange={e=>setExternalInterviewer(v=>({...v,role:e.target.value}))} placeholder="Role / relationship" className="input"/></div><p className="mt-2 text-[10px] text-[#9AA8B3]">External interviewers will be supported in the next invitation layer; their details are not stored as team members.</p></div></div>}</div>
        {mode==="Online"&&<><label><span className="label">Meeting provider</span><select value={meetingProvider} onChange={e=>setMeetingProvider(e.target.value)} className="input"><option>Google Meet</option><option>Microsoft Teams</option><option>Zoom</option><option>Other</option></select></label><label><span className="label">Meeting link</span><div className="relative"><Link2 size={14} className="absolute left-3 top-3.5 text-[#9AA8B3]"/><input value={meetingLink} onChange={e=>setMeetingLink(e.target.value)} className="input pl-9" placeholder="https://…"/></div></label></>}
        <label><span className="label">Scorecard</span><select value={scorecardId} onChange={e=>setScorecardId(e.target.value)} className="input"><option value="">No scorecard</option>{scorecards.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <div><span className="label">Reminders</span><div className="mt-2 flex flex-wrap gap-2">{[[1440,"24h"],[60,"1h"],[15,"15m"]].map(([v,label])=><button type="button" key={String(v)} onClick={()=>setReminders(r=>r.includes(v as number)?r.filter(x=>x!==v):[...r,v as number])} className={"rounded-xl border px-3 py-2 text-[11px] "+(reminders.includes(v as number)?"border-[#B9DDD7] bg-[#E7F3F1] text-[#167D73]":"border-[#DDE5EA] bg-white text-[#526A7D]")}>{label}</button>)}</div></div>
        <label className="sm:col-span-2"><span className="label">Internal notes</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} className="input min-h-[90px]" placeholder="Anything the interview team should know…"/></label>
      </div>
      {notice&&<p className="mt-4 rounded-xl bg-[#FFF8E8] px-3 py-2.5 text-xs text-[#9A6A19]">{notice}</p>}
      <div className="mt-6 flex justify-end gap-2"><button onClick={()=>setShowNew(false)} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Cancel</button><button disabled={saving} onClick={createInterview} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50">{saving?"Saving…":"Create interview"}</button></div>
    </div></div>}

    {detail&&<div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 px-5 py-8"><div className="mx-auto w-full max-w-[760px] rounded-2xl border border-[#DDE5EA] bg-white shadow-[0_24px_70px_rgba(23,52,84,0.18)]"><div className="border-b border-[#EEF2F4] p-6 flex items-start justify-between"><div><p className="text-[10px] font-semibold tracking-[0.15em] text-[#167D73] uppercase">INTERVIEW DETAILS</p><h2 className="mt-1 text-xl font-semibold text-[#173454]">{detail.candidate?.full_name??"Candidate"}</h2><p className="mt-1 text-xs text-[#71859A]">{detail.job?.title??"Job"} · {detail.interview_type??"Interview"}</p></div><button onClick={()=>setDetail(null)}><X size={18} className="text-[#71859A]"/></button></div>
      <div className="grid gap-4 p-6 sm:grid-cols-2"><div className="card"><p className="kicker">Schedule</p><p className="value">{formatDateTime(detail.confirmed_time??detail.proposed_times?.[0])}</p><p className="muted">{detail.duration_minutes??60} min · {detail.timezone??"Local"}</p></div><div className="card"><p className="kicker">Mode</p><p className="value">{detail.interview_mode??"Online"}</p><p className="muted">{detail.meeting_provider??""} {detail.meeting_link?"· link ready":""}</p></div><div className="card"><p className="kicker">Interviewers</p><p className="value">{detail.interviewers?.map(x=>x.full_name||x.email).filter(Boolean).join(", ")||"Not assigned"}</p></div><div className="card"><p className="kicker">Candidate response</p><p className="value">{detail.candidate_response??"Awaiting response"}</p>{detail.candidate_confirmed_at&&<p className="muted">Confirmed {formatDateTime(detail.candidate_confirmed_at)}</p>}</div><div className="sm:col-span-2 card"><p className="kicker">Scorecard</p><p className="value">{detail.scorecard?.name??"No scorecard assigned"}</p><p className="muted">{detail.scorecard?.criteria?.length??0} criteria</p></div><div className="sm:col-span-2 card"><p className="kicker">Reminders</p><p className="value">{(detail.reminder_minutes??[]).map(m=>m>=1440?Math.round(m/1440)+" day":m+" min").join(" · ")||"None"}</p></div></div>
      <div className="border-t border-[#EEF2F4] p-6 flex flex-wrap gap-2"><Link href={"/employer/applicants/"+(detail.application?.id??"")} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Open candidate</Link>{detail.meeting_link&&<a href={detail.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]"><Video size={14}/> Join meeting <ExternalLink size={12}/></a>}{detail.status==="Confirmed"&&<><button onClick={()=>addToCalendar(detail)} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs text-white">Add to Google Calendar</button><button onClick={()=>downloadIcs(detail)} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Download .ics</button><button onClick={()=>{setDetail(null);openFeedback(detail)}} className="inline-flex items-center gap-1.5 rounded-xl border border-[#B9DDD7] bg-[#E7F3F1] px-4 py-2.5 text-xs text-[#167D73]"><FileCheck2 size={14}/> Submit feedback</button></>}</div>
    </div></div>}

    {feedback&&<div className="fixed inset-0 z-[60] overflow-y-auto bg-[#173454]/25 px-5 py-8"><div className="mx-auto w-full max-w-[680px] rounded-2xl border border-[#DDE5EA] bg-white p-6 shadow-[0_24px_70px_rgba(23,52,84,0.18)] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold tracking-[0.15em] text-[#167D73] uppercase">INTERVIEW FEEDBACK</p><h2 className="mt-1 text-xl font-semibold text-[#173454]">{feedback.candidate?.full_name??"Candidate"}</h2><p className="mt-1 text-xs text-[#71859A]">{selectedCard?.name??"Interview scorecard"}</p></div><button onClick={()=>setFeedback(null)}><X size={18} className="text-[#71859A]"/></button></div>
      <div className="mt-6 space-y-5">{(selectedCard?.criteria??[]).map((c:any)=><div key={c.name} className="rounded-xl border border-[#DDE5EA] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-[#173454]">{c.name}</p><p className="mt-1 text-xs text-[#71859A]">{c.description}</p></div><div className="flex gap-1">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setFeedbackRatings(v=>({...v,[c.name]:n}))} className={"h-8 w-8 rounded-lg border text-xs "+((feedbackRatings[c.name]??0)>=n?"border-[#B9DDD7] bg-[#E7F3F1] text-[#167D73]":"border-[#DDE5EA] text-[#8A99A5]")}>{n}</button>)}</div></div></div>)}
      <label><span className="label">Recommendation</span><select value={recommendation} onChange={e=>setRecommendation(e.target.value)} className="input"><option value="">Select</option><option>Strong hire</option><option>Hire</option><option>Hold</option><option>No hire</option></select></label>
      <label><span className="label">Strengths</span><textarea value={strengths} onChange={e=>setStrengths(e.target.value)} className="input min-h-[80px]" placeholder="Evidence and strengths observed…"/></label>
      <label><span className="label">Concerns</span><textarea value={concerns} onChange={e=>setConcerns(e.target.value)} className="input min-h-[80px]" placeholder="Risks, gaps or follow-up areas…"/></label>
      <label><span className="label">Private interviewer notes</span><textarea value={feedbackNotes} onChange={e=>setFeedbackNotes(e.target.value)} className="input min-h-[80px]" placeholder="Additional notes for the hiring team…"/></label></div>
      {notice&&<p className="mt-4 rounded-xl bg-[#FFF8E8] px-3 py-2.5 text-xs text-[#9A6A19]">{notice}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={()=>setFeedback(null)} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Cancel</button><button disabled={saving} onClick={saveFeedback} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white">{saving?"Saving…":"Submit feedback"}</button></div>
    </div></div>}
    <style jsx global>{`.label{display:block;font-size:11px;font-weight:500;color:#526A7D}.input{margin-top:6px;height:44px;width:100%;border:1px solid #DDE5EA;border-radius:12px;background:#fff;padding:0 12px;font-size:12px;color:#173454;outline:none}.input:focus{border-color:#A9D4CE}.card{border:1px solid #DDE5EA;border-radius:14px;background:#FCFDFD;padding:16px}.kicker{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8A99A5}.value{margin-top:6px;font-size:13px;font-weight:500;color:#173454}.muted{margin-top:4px;font-size:11px;color:#71859A}`}</style>
  </div></EmployerShell>;
}
