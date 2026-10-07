"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ClipboardCheck, Filter, Search, ShieldCheck, UserRound, X } from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type Job = { id:string; title:string; location:string|null; };
type Application = { id:string; user_id:string; job_id:string; status:string|null; pipeline_stage:string|null; };
type Profile = { id:string; full_name:string|null; email:string|null; current_location:string|null; };
type Offer = { id:string; application_id:string|null; candidate_name:string|null; candidate_email:string|null; job_title:string|null; status:string|null; start_date:string|null; responded_at:string|null; };
type Check = {
  id:string; application_id:string|null; offer_id:string|null; candidate_name:string; candidate_email:string|null;
  job_title:string|null; status:string; package_name?:string; provider_name:string|null; provider_case_id:string|null; provider_org_id:string|null; provider_status:string|null; report_url:string|null; report_received_at:string|null; last_provider_update_at:string|null; verification_method:string; unable_to_proceed_reason:string|null; stop_request_status:string; stop_requested_at:string|null; stop_reason:string|null; stopped_at:string|null;
  requested_at:string|null; due_at:string|null; completed_at:string|null; joining_date:string|null; tat_days:number|null; tat_unit:string|null; tat_start_basis:string|null; tat_start_at:string|null; tat_due_at:string|null; tat_working_calendar:string|null; overall_note:string|null;
  consent_status:string; consent_at:string|null; jurisdiction:string|null; legal_basis:string|null; retention_until:string|null;
};
type Item = { id:string; background_check_id:string; check_type:string; status:string; provider:string|null; result_summary:string|null; reviewer_note:string|null; completed_at:string|null; unable_to_proceed_reason:string|null; };

const CHECK_TYPES = ["Identity","Address","Employment","Education","Criminal","Reference","Right to work","Professional licence"];
const STATUS = ["All","Not started","Requested","In progress","Needs attention","Unable to proceed","Clear","Completed","Cancelled"];

function tone(s:string) {
  if (s==="Clear") return "bg-[#E7F3F1] text-[#167D73]";
  if (s==="In progress" || s==="Requested") return "bg-[#EDF5FF] text-[#3D6F9E]";
  if (s==="Needs attention" || s==="Consider") return "bg-[#FFF7E6] text-[#8A641E]";
  if (s==="Failed" || s==="Cancelled" || s==="Unable to proceed") return "bg-[#FFF1EE] text-[#B34E3E]";
  return "bg-[#F5F7F7] text-[#71859A]";
}
function itemTone(s:string) {
  if (s==="Clear") return "bg-[#E7F3F1] text-[#167D73]";
  if (s==="In progress" || s==="Requested") return "bg-[#EDF5FF] text-[#3D6F9E]";
  if (s==="Needs review" || s==="Unable to verify") return "bg-[#FFF7E6] text-[#8A641E]";
  return "bg-[#F5F7F7] text-[#71859A]";
}
function date(v:string|null) { return v ? new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"; }
function addWorkingDays(start:string,days:number){const d=new Date(start);let left=Math.max(0,Math.floor(days));while(left>0){d.setDate(d.getDate()+1);const day=d.getDay();if(day!==0&&day!==6)left--;}return d;}
function tatLabel(c:Check){if(!c.tat_days||!c.tat_due_at)return "No TAT";return `${c.tat_days} working day${c.tat_days===1?"":"s"}`;}
function tatState(c:Check){if(!c.tat_due_at)return "No TAT";const due=new Date(c.tat_due_at);const end=c.completed_at?new Date(c.completed_at):new Date();const days=Math.ceil((due.getTime()-end.getTime())/86400000);if(c.completed_at)return days>=0?`Completed ${days}d early`:`Completed ${Math.abs(days)}d late`;return days>=0?`Due in ${days}d`:`Overdue by ${Math.abs(days)}d`;}
function joiningGap(c:Check){if(!c.joining_date)return null;const join=new Date(c.joining_date+"T23:59:59");const end=c.completed_at?new Date(c.completed_at):new Date();return Math.round((join.getTime()-end.getTime())/86400000);}
function joiningGapText(c:Check){const gap=joiningGap(c);if(gap===null)return "—";return gap>=0?`${gap} days to joining`:`${Math.abs(gap)} days after joining`;}
function tatJoiningWarning(c:Check){if(!c.joining_date||!c.tat_due_at)return null;const diff=Math.ceil((new Date(c.joining_date+"T23:59:59").getTime()-new Date(c.tat_due_at).getTime())/86400000);return diff<0?`TAT ends ${Math.abs(diff)}d after joining`:`${diff}d buffer before joining`; }

export default function BGVPage() {
  const supabase=createClient();
  const [companyId,setCompanyId]=useState("");
  const [checks,setChecks]=useState<Check[]>([]);
  const [items,setItems]=useState<Item[]>([]);
  const [applications,setApplications]=useState<Application[]>([]);
  const [jobs,setJobs]=useState<Job[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [offers,setOffers]=useState<Offer[]>([]);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("All");
  const [open,setOpen]=useState(false);
  const [selected,setSelected]=useState<Check|null>(null);
  const [selectedItems,setSelectedItems]=useState<Item[]>([]);
  const [candidateId,setCandidateId]=useState("");
  const [jobId,setJobId]=useState("");
  const [dueDate,setDueDate]=useState("");
  const [providerName,setProviderName]=useState("");
  const [providerCaseId,setProviderCaseId]=useState("");
  const [note,setNote]=useState("");
  const [saving,setSaving]=useState(false);
  const [requestedApplication,setRequestedApplication]=useState<string | null>(null);
  const [access,setAccess]=useState<"none"|"view"|"initiate">("none");
  const [providerEmail,setProviderEmail]=useState("");
  const [providerContactName,setProviderContactName]=useState("");
  const [providerInviteUrl,setProviderInviteUrl]=useState("");
  const [verificationMethod,setVerificationMethod]=useState<"Provider"|"Internal">("Provider");
  const [customChecks,setCustomChecks]=useState("");
  const [unableReason,setUnableReason]=useState("");
  const [stopReason,setStopReason]=useState("");
  const [emailTo,setEmailTo]=useState("");
  const [emailSubject,setEmailSubject]=useState("");
  const [emailMessage,setEmailMessage]=useState("");
  const [sendingEmail,setSendingEmail]=useState(false);
  const [sourceOfferId,setSourceOfferId]=useState<string|null>(null);
  const [tatDays,setTatDays]=useState("");
  const [tatStartBasis,setTatStartBasis]=useState<"Initiated"|"Offer accepted">("Initiated");
  const sourceOffer=useMemo(()=>sourceOfferId?offers.find(o=>o.id===sourceOfferId)||null:null,[sourceOfferId,offers]);
  const tatPreviewStart=tatStartBasis==="Offer accepted"?(sourceOffer?.responded_at||new Date().toISOString()):new Date().toISOString();
  const tatPreviewDue=tatDays && Number(tatDays)>0 ? addWorkingDays(tatPreviewStart,Math.floor(Number(tatDays))) : null;
  const [invitingProvider,setInvitingProvider]=useState(false);

  async function load() {
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return}
    const company=await getOrCreateCompanyId(supabase,user);
    setCompanyId(company);
    const [{data:tm},{data:ep}]=await Promise.all([
      supabase.from("company_team_members").select("role,permissions").eq("company_id",company).eq("user_id",user.id).maybeSingle(),
      supabase.from("employer_profiles").select("role").eq("id",user.id).maybeSingle()
    ]);
    const level=((tm?.permissions as any)?.bgv as string)||null;
    const role=tm?.role||ep?.role||"";
    const resolved: "none"|"view"|"initiate" = (role==="Owner"||role==="Admin") ? "initiate" : (level==="initiate"||level==="view" ? level : "none");
    setAccess(resolved);
    if(resolved==="none"){setLoading(false);return}
    const [{data:cd},{data:jd},{data:od}] = await Promise.all([
      supabase.from("background_checks").select("id,application_id,offer_id,candidate_name,candidate_email,job_title,status,verification_method,unable_to_proceed_reason,stop_request_status,stop_requested_at,stop_reason,stopped_at,provider_name,provider_case_id,provider_org_id,provider_status,report_url,report_received_at,last_provider_update_at,requested_at,due_at,completed_at,joining_date,tat_days,tat_unit,tat_start_basis,tat_start_at,tat_due_at,tat_working_calendar,overall_note,consent_status,consent_at,jurisdiction,legal_basis,retention_until").eq("company_id",company).order("created_at",{ascending:false}),
      supabase.from("jobs").select("id,title,location").eq("company_id",company).order("created_at",{ascending:false}),
      supabase.from("offers").select("id,application_id,candidate_name,candidate_email,job_title,status,start_date,responded_at").eq("company_id",company).in("status",["Accepted","Sent","Approved"]).order("created_at",{ascending:false})
    ]);
    const cs=(cd??[]) as Check[]; setChecks(cs);
    setJobs((jd??[]) as Job[]);
    setOffers((od??[]) as Offer[]);
    const jobIds=(jd??[]).map((j:any)=>j.id);
    const appsResult=jobIds.length ? await supabase.from("applications").select("id,user_id,job_id,status,pipeline_stage").in("job_id",jobIds).order("applied_at",{ascending:false}) : {data:[]};
    const apps=(appsResult.data??[]) as Application[]; setApplications(apps);
    const userIds=[...new Set(apps.map(a=>a.user_id).filter(Boolean))];
    if(userIds.length){const p=await supabase.from("profiles").select("id,full_name,email,current_location").in("id",userIds);const m:Record<string,Profile>={};for(const x of (p.data??[]) as Profile[])m[x.id]=x;setProfiles(m)}
    const ids=cs.map(c=>c.id);
    if(ids.length){const ir=await supabase.from("background_check_items").select("id,background_check_id,check_type,status,provider,result_summary,reviewer_note,completed_at,unable_to_proceed_reason").in("background_check_id",ids);setItems((ir.data??[]) as Item[])}
    setLoading(false);
  }
  useEffect(()=>{ const a=new URLSearchParams(window.location.search).get("application"); setRequestedApplication(a); load(); },[]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows=useMemo(()=>checks.filter(c=>{
    const q=query.trim().toLowerCase();
    return (!q || [c.candidate_name,c.candidate_email,c.job_title,c.package_name].filter(Boolean).join(" ").toLowerCase().includes(q)) && (filter==="All" || c.status===filter);
  }),[checks,query,filter]);

  const counts=useMemo(()=>({
    total:checks.length,
    active:checks.filter(c=>["Requested","In progress","Needs attention"].includes(c.status)).length,
    attention:checks.filter(c=>c.status==="Needs attention"||c.status==="Consider").length,
    clear:checks.filter(c=>c.status==="Clear").length
  }),[checks]);

  const demoCandidate={id:"demo-candidate-1",name:"Aarav Mehta",email:"aarav.mehta@example.com",job:jobs[0]??null};
  const readyOffers=useMemo(()=>offers.filter(o=>o.status==="Accepted"&&!checks.some(c=>c.offer_id===o.id)),[offers,checks]);
  useEffect(()=>{ const offer=requestedApplication?offers.find(o=>o.application_id===requestedApplication&&o.status==="Accepted"):null; if(access==="initiate"&&offer){ openFromOffer(offer); setRequestedApplication(null); } },[offers,requestedApplication,access]);

  function openFromOffer(o:Offer){ setSelected(null); setMessage(""); setCandidateId(o.application_id||"demo-candidate-1"); setJobId(o.application_id?(applications.find(a=>a.id===o.application_id)?.job_id||""):(jobs[0]?.id||"")); setDueDate(""); setProviderName(""); setProviderCaseId(""); setNote(""); setSourceOfferId(null); setVerificationMethod("Provider"); setTatDays(""); setTatStartBasis("Initiated"); setCustomChecks(""); setUnableReason(""); setStopReason(""); setEmailTo(o.candidate_email||""); setEmailSubject("Background verification"); setSourceOfferId(o.id); setTatDays(""); setTatStartBasis("Offer accepted"); setDueDate(""); setEmailMessage(""); setSelectedItems([]); setOpen(true); }

  function openNew(source?:Check|null, demo=false) {
    setSelected(source??null);
    setSourceOfferId(source?.offer_id??null);
    setMessage("");
    if(source){
      const app=applications.find(a=>a.id===source.application_id);
      setCandidateId(app?.id ?? "");
      setJobId(app?.job_id ?? jobs.find(j=>j.title===source.job_title)?.id ?? "");
      setDueDate(source.due_at?.slice(0,10)??""); setNote(source.overall_note??""); setTatDays(source.tat_days!=null?String(source.tat_days):""); setTatStartBasis((source.tat_start_basis as "Initiated"|"Offer accepted")||"Initiated");
      setTimeout(()=>loadItems(source.id),0);
    } else {
      setCandidateId(demo ? "demo-candidate-1" : "");
      setJobId(demo ? (jobs[0]?.id??"") : "");
      setDueDate(""); setProviderName(""); setProviderCaseId(""); setNote(""); setVerificationMethod("Provider"); setTatDays(""); setTatStartBasis("Initiated"); setCustomChecks(""); setUnableReason(""); setStopReason(""); setEmailTo(""); setEmailSubject(""); setEmailMessage("");
      setSelectedItems([]);
    }
    setOpen(true);
  }

  async function loadItems(id:string) {
    const {data}=await supabase.from("background_check_items").select("id,background_check_id,check_type,status,provider,result_summary,reviewer_note,completed_at,unable_to_proceed_reason").eq("background_check_id",id);
    setSelectedItems((data??[]) as Item[]);
  }

  function applicantLabel(a:Application) {
    const p=profiles[a.user_id]; const j=jobs.find(x=>x.id===a.job_id);
    return (p?.full_name??"Candidate")+" · "+(j?.title??"Role");
  }

  async function inviteProvider() {
    if(!selected){return}
    setInvitingProvider(true);setMessage("");setProviderInviteUrl("");
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setMessage("Your session has expired.");setInvitingProvider(false);return}
    const r=await fetch("/api/bgv/provider/invite",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({backgroundCheckId:selected.id,providerName:selected.provider_name||"BGV Provider",email:providerEmail,fullName:providerContactName})});
    const b=await r.json().catch(()=>({}));
    if(!r.ok){setMessage(b.error||"Could not create provider access.");setInvitingProvider(false);return}
    setProviderInviteUrl(b.inviteUrl||"");setMessage("Secure provider access link created. Share it with the provider contact.");
    await load();setInvitingProvider(false);
  }

  async function createCheck() {
    setSaving(true); setMessage("");
    let name="",email:string|null=null,role="";
    let applicationId:string|null=null,offerId:string|null=null;
    if(candidateId==="demo-candidate-1"){name=demoCandidate.name;email=demoCandidate.email;role=demoCandidate.job?.title??"Sample role";offerId=sourceOfferId;}
    else {
      const a=applications.find(x=>x.id===candidateId); const p=a?profiles[a.user_id]:undefined; const j=a?jobs.find(x=>x.id===a.job_id):undefined;
      if(!a||!p){setMessage("Choose an applicant.");setSaving(false);return}
      name=p.full_name??"Candidate"; email=p.email; role=j?.title??"Role"; applicationId=a.id;
      const offer=offers.find(o=>o.application_id===a.id); offerId=offer?.id??null;
    }
    const now=new Date().toISOString();
    const sourceOffer=offerId?offers.find(o=>o.id===offerId):null;
    if(candidateId!=="demo-candidate-1" && (!sourceOffer || sourceOffer.status!=="Accepted")){setMessage("BGV can be initiated only from an accepted offer.");setSaving(false);return}
    const joiningDate=sourceOffer?.start_date||null;
    const tatN=Math.floor(Number(tatDays));
    if(!Number.isFinite(tatN)||tatN<1){setMessage("Enter a custom BGV turnaround time.");setSaving(false);return}
    const tatStart=tatStartBasis==="Offer accepted" ? (sourceOffer?.responded_at||now) : now;
    const tatDue=addWorkingDays(tatStart,tatN);
    const tatDueIso=new Date(tatDue.getFullYear(),tatDue.getMonth(),tatDue.getDate(),23,59,59).toISOString();
    const {data,error}=await supabase.from("background_checks").insert({
      company_id:companyId,application_id:applicationId,offer_id:offerId,candidate_name:name,candidate_email:email,job_title:role,
      status:"Not started",verification_method:verificationMethod,provider_name:verificationMethod==="Provider"?(providerName.trim()||null):null,provider_case_id:verificationMethod==="Provider"?(providerCaseId.trim()||null):null,requested_at:now,due_at:tatDueIso,joining_date:joiningDate,tat_days:tatN,tat_unit:"working_days",tat_start_basis:tatStartBasis,tat_start_at:tatStart,tat_due_at:tatDueIso,tat_working_calendar:"Mon-Fri",
      consent_status:"Not requested",jurisdiction:null,legal_basis:null,retention_until:null,overall_note:note||null
    }).select("*").single();
    if(error||!data){setMessage(error?.message??"Could not create the BGV case.");setSaving(false);return}
    if(customChecks.trim()){const names=customChecks.split(String.fromCharCode(10)).map(x=>x.trim()).filter(Boolean);if(names.length)await supabase.from("background_check_items").insert(names.map(check_type=>({background_check_id:data.id,company_id:companyId,check_type,status:"Pending",provider:verificationMethod==="Provider"?(providerName.trim()||null):"Internal"})));} await supabase.from("background_check_events").insert({background_check_id:data.id,company_id:companyId,event_type:"bgv_case_created",metadata:{source:"employer",verification_method:verificationMethod,note:note||null}});
    if(applicationId) await supabase.from("applications").update({next_step:"Background verification",updated_at:now}).eq("id",applicationId);
    await load(); setSelected(data as Check); await loadItems(data.id); setOpen(true); setMessage("BGV case created. Add the provider's current status and report details as they become available."); setSaving(false);
  }

  async function updateCheck(patch:Partial<Check>) {
    if(!selected)return;
    const {data,error}=await supabase.from("background_checks").update({...patch,updated_at:new Date().toISOString()}).eq("id",selected.id).select("*").single();
    if(error||!data){setMessage(error?.message??"Could not save.");return}
    setSelected(data as Check); setChecks(x=>x.map(c=>c.id===selected.id?data as Check:c));
    await supabase.from("background_check_events").insert({background_check_id:selected.id,company_id:companyId,event_type:"check_updated",metadata:patch});
  }

  async function updateItem(id:string,patch:Partial<Item>) {
    const {data,error}=await supabase.from("background_check_items").update({...patch,updated_at:new Date().toISOString()}).eq("id",id).select("id,background_check_id,check_type,status,provider,result_summary,reviewer_note,completed_at").single();
    if(error||!data){setMessage(error?.message??"Could not update verification.");return}
    setSelectedItems(x=>x.map(i=>i.id===id?data as Item:i));
    const next=[...selectedItems.map(i=>i.id===id?data as Item:i)];
    const statuses=next.map(i=>i.status);
    let overall="In progress";
    if(statuses.some(s=>s==="Needs review"||s==="Unable to verify")) overall="Needs attention";
    else if(statuses.length && statuses.every(s=>s==="Clear"||s==="Not applicable")) overall="Clear";
    else if(statuses.every(s=>s==="Pending")) overall="Not started";
    await updateCheck({status:overall,completed_at:overall==="Clear"?new Date().toISOString():null});
    await supabase.from("background_check_events").insert({background_check_id:selected?.id,company_id:companyId,event_type:"verification_item_updated",metadata:{check_type:data.check_type,status:data.status}});
  }




  return <EmployerShell>
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73]">HIRING</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#173454]">Background Verification</h1><p className="mt-2 max-w-2xl text-sm text-[#71859A]">Connect your BGV provider to each case and give authorized employer users a clear view of provider progress and results.</p></div>
        <div className="flex gap-2"><button onClick={()=>openNew(null,true)} className="rounded-xl border border-[#B9DDD7] bg-white px-4 py-2.5 text-xs font-medium text-[#167D73]">Preview sample</button></div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Active",counts.active,"Requests moving through verification"],["Needs attention",counts.attention,"Results requiring review"],["Clear",counts.clear,"Checks completed clear"],["Total",counts.total,"All verification cases"]].map(([label,count,sub])=><div key={String(label)} className="rounded-2xl border border-[#DDE5EA] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A99A5]">{label}</p><p className="mt-2 text-2xl font-semibold text-[#173454]">{count}</p><p className="mt-1 text-[11px] text-[#71859A]">{sub}</p></div>)}
      </div>

      <div className="mt-6 rounded-2xl border border-[#B9DDD7] bg-[#F3FAF8] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#173454]">Ready for BGV</p><p className="mt-1 text-[11px] text-[#71859A]">Accepted offers that do not yet have a verification case.</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-[#167D73]">{readyOffers.length} ready</span></div>{readyOffers.length>0?<div className="mt-4 space-y-2">{readyOffers.map(o=><div key={o.id} className="flex flex-col gap-3 rounded-xl border border-[#DDE5EA] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-[#173454]">{o.candidate_name||"Candidate"}</p><p className="mt-1 text-[10px] text-[#71859A]">{o.job_title||"Role"} · Offer accepted</p></div><button onClick={()=>openFromOffer(o)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#167D73] px-3 py-2 text-[10px] font-medium text-white">Initiate BGV <ArrowRight size={13}/></button></div>)}</div>:<p className="mt-4 text-[11px] text-[#71859A]">No accepted offers are waiting for BGV.</p>}</div>

      <div className="mt-6 rounded-2xl border border-[#DDE5EA] bg-white p-3"><div className="flex flex-col gap-2 lg:flex-row"><div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#F7F9F9] px-3"><Search size={15} className="text-[#8A99A5]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search candidate, role or verification…" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#9AA8B3]"/></div><div className="relative"><Filter size={13} className="pointer-events-none absolute left-3 top-3.5 text-[#8A99A5]"/><select value={filter} onChange={e=>setFilter(e.target.value)} className="h-10 appearance-none rounded-xl border border-[#DDE5EA] bg-white pl-8 pr-9 text-xs text-[#526A7D] outline-none">{STATUS.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-3 top-3.5 text-[#8A99A5]"/></div></div></div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white">
        <div className="hidden grid-cols-[minmax(230px,1.4fr)_1fr_.8fr_.8fr_.8fr_30px] gap-3 border-b border-[#EEF2F4] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A99A5] md:grid"><span>Candidate</span><span>Role</span><span>Status</span><span>Provider status</span><span>Due</span><span/></div>
        {loading?<div className="px-5 py-16 text-center text-sm text-[#71859A]">Loading verification cases…</div>:rows.length===0?<div className="p-12 text-center"><ShieldCheck className="mx-auto text-[#9AA8B3]" size={26}/><p className="mt-3 text-sm font-medium text-[#173454]">No background checks yet</p><p className="mt-1 text-xs text-[#71859A]">Start from an accepted offer or create a sample verification to explore the workflow.</p>{access==="initiate"&&<button onClick={()=>openNew(null,true)} className="mt-4 rounded-xl border border-[#B9DDD7] px-4 py-2 text-xs font-medium text-[#167D73]">Preview sample</button>}</div>:
        rows.map(c=><button key={c.id} onClick={()=>openNew(c)} className="grid w-full gap-3 border-b border-[#EEF2F4] px-5 py-4 text-left hover:bg-[#FCFDFD] md:grid-cols-[minmax(230px,1.4fr)_1fr_.8fr_.8fr_.8fr_30px] md:items-center"><span><span className="block text-sm font-medium text-[#173454]">{c.candidate_name}</span><span className="mt-1 block truncate text-[11px] text-[#71859A]">{c.candidate_email||"Email not provided"}</span></span><span className="text-xs text-[#526A7D]">{c.job_title||"Role"}</span><span><span className={"rounded-full px-2.5 py-1 text-[10px] font-medium "+tone(c.status)}>{c.status}</span></span><span className="text-xs text-[#526A7D]">{c.provider_status||c.status}</span><span className="text-xs text-[#71859A]"><span className="block">{date(c.tat_due_at||c.due_at)}</span><span className="mt-1 block text-[10px]">{tatState(c)}</span></span><ArrowRight size={15} className="text-[#9AA8B3]"/></button>)}
      </div>

      <div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><div className="flex gap-3"><ClipboardCheck size={18} className="mt-0.5 text-[#167D73]"/><div><p className="text-xs font-semibold text-[#173454]">Connected hiring flow</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">Employer initiates → BGV provider works the case → provider updates HRANITI → authorized employer team reviews. HRANITI does not perform or adjudicate the verification.</p></div></div></div>
    </div>

    {open&&access==="initiate"&&<div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 p-4 sm:p-7">
      <div className="mx-auto max-w-[1180px] rounded-2xl bg-white shadow-[0_24px_80px_rgba(23,52,84,0.2)]">
        <div className="flex items-center justify-between border-b border-[#E6ECEF] px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#167D73]">{selected?"BGV CASE":"LINK PROVIDER CASE"}</p><h2 className="mt-1 text-lg font-semibold text-[#173454]">{selected?.candidate_name??(candidateId==="demo-candidate-1"?demoCandidate.name:"Link provider case")}</h2></div><button onClick={()=>setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71859A] hover:bg-[#F5F7F7]"><X size={18}/></button></div>

        {!selected?<div className="grid lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
            <label className="block text-xs font-medium text-[#526A7D]">Applicant</label><div className="mt-5"><label className="block text-xs font-medium text-[#526A7D]">Verification method</label><select value={verificationMethod} onChange={e=>setVerificationMethod(e.target.value as "Provider"|"Internal")} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs"><option value="Provider">External BGV provider</option><option value="Internal">Employer / internal team</option></select><p className="mt-2 text-[10px] leading-4 text-[#9AA8B3]">{verificationMethod==="Provider"?"The provider performs the checks and updates HRANITI.":"Your employer team performs the checks and records the outcome in HRANITI."}</p></div>
            <select value={candidateId} onChange={e=>setCandidateId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs outline-none"><option value="">Select applicant</option><option value="demo-candidate-1">Aarav Mehta · Sample candidate</option>{applications.map(a=><option key={a.id} value={a.id}>{applicantLabel(a)}</option>)}</select>
            <p className="mt-2 text-[10px] leading-4 text-[#9AA8B3]">For a real case, use the applicant linked to the accepted offer. The sample candidate is stored without a personal account.</p>
            <div className="mt-5 rounded-xl border border-[#DDE5EA] bg-[#F7F9F9] p-4"><p className="text-xs font-semibold text-[#173454]">What HRANITI does</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">HRANITI records the BGV case and shows the provider's status and report. The employer and its BGV provider handle the actual verification outside this workflow.</p></div>
            {verificationMethod==="Provider"&&<div className="mt-5 grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-[#526A7D]">Provider name</label><input value={providerName} onChange={e=>setProviderName(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Provider name"/></div><div><label className="block text-xs font-medium text-[#526A7D]">Provider case ID</label><input value={providerCaseId} onChange={e=>setProviderCaseId(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Case reference"/></div></div>}<div className="mt-5 rounded-xl border border-[#DDE5EA] bg-[#F7F9F9] p-4"><div className="grid grid-cols-[1fr_150px] gap-3"><div><label className="block text-xs font-medium text-[#526A7D]">BGV turnaround time</label><input type="number" min="1" max="365" value={tatDays} placeholder="Enter number" onChange={e=>setTatDays(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs"/></div><div><label className="block text-xs font-medium text-[#526A7D]">Starts from</label><select value={tatStartBasis} onChange={e=>setTatStartBasis(e.target.value as "Initiated"|"Offer accepted")} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs"><option value="Initiated">BGV initiated</option><option value="Offer accepted">Offer accepted</option></select></div></div><p className="mt-2 text-[10px] text-[#71859A]">Working days exclude weekends.</p><p className="mt-3 text-[10px] font-medium text-[#167D73]">{tatPreviewDue ? `${tatDays} working days · target ${date(tatPreviewDue.toISOString())}` : "Enter a custom TAT to calculate the target date."}</p>{sourceOffer?.start_date&&<p className="mt-1 text-[10px] text-[#71859A]">Joining date: {date(sourceOffer.start_date)}</p>}</div>
            <label className="mt-4 block text-xs font-medium text-[#526A7D]">Internal note</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs outline-none" placeholder="Private verification context…"/>
          </aside>
          <section className="p-5 sm:p-7"><div className="rounded-2xl border border-[#DDE5EA] bg-[#F7F9F9] p-5"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[#167D73]"/><div><p className="text-sm font-semibold text-[#173454]">Provider-owned verification</p><p className="mt-1 text-xs leading-5 text-[#71859A]">The employer's BGV provider performs the checks, collects candidate information and issues the report. HRANITI only keeps the case reference and shows provider status/results.</p></div></div></div><div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><p className="text-xs font-semibold text-[#173454]">HRANITI will show</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{["Provider status","Pending items","Completion date","Provider report / link"].map(x=><div key={x} className="rounded-xl bg-[#F7F9F9] px-3 py-2.5 text-xs text-[#526A7D]">{x}</div>)}</div></div><div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><p className="text-xs font-semibold text-[#173454]">Custom checks</p><p className="mt-1 text-[10px] text-[#71859A]">Checks differ by company. Add one per line; the provider or internal team can add more later.</p><textarea value={customChecks} onChange={e=>setCustomChecks(e.target.value)} rows={4} className="mt-3 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs outline-none" placeholder={"Identity\nEmployment\nEducation\nReference"} /></div><div className="mt-5 flex justify-end gap-2 border-t border-[#E6ECEF] pt-5"><button onClick={()=>setOpen(false)} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Cancel</button><button onClick={createCheck} disabled={saving} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white">{saving?"Saving…":"Link BGV case"}</button></div>{message&&<p className="mt-3 text-right text-xs text-[#167D73]">{message}</p>}</section>
        </div>:
        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F3F1] text-[#167D73]"><UserRound size={18}/></span><div><p className="text-sm font-semibold text-[#173454]">{selected.candidate_name}</p><p className="text-[11px] text-[#71859A]">{selected.candidate_email||"Email not provided"}</p></div></div>
            <div className="mt-5 space-y-3"><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Role</p><p className="mt-1 text-xs text-[#526A7D]">{selected.job_title||"—"}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Provider</p><p className="mt-1 text-xs text-[#526A7D]">{selected.provider_name||"External BGV provider"}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">TAT</p><p className="mt-1 text-xs text-[#526A7D]">{tatLabel(selected)} · {date(selected.tat_due_at||selected.due_at)}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Joining</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.joining_date)}</p></div></div>
            <div className="mt-6 rounded-2xl bg-[#F7F9F9] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Provider status</p><p className="mt-1 text-xs text-[#526A7D]">{selected.provider_status||selected.status}</p><p className="mt-3 text-[10px] leading-4 text-[#71859A]">The employer and BGV provider own the verification process. HRANITI is the visibility layer.</p></div><div className="mt-4 rounded-2xl border border-[#DDE5EA] bg-white p-4">
              <p className="text-xs font-semibold text-[#173454]">Provider access</p>
              <p className="mt-1 text-[10px] leading-4 text-[#71859A]">Create a restricted provider account for this case. No HRANITI employer access is granted.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input value={providerContactName} onChange={e=>setProviderContactName(e.target.value)} className="h-9 rounded-lg border border-[#DDE5EA] px-3 text-[11px]" placeholder="Provider contact name"/>
                <input value={providerEmail} onChange={e=>setProviderEmail(e.target.value)} className="h-9 rounded-lg border border-[#DDE5EA] px-3 text-[11px]" placeholder="Provider work email" type="email"/>
              </div>
              <button onClick={inviteProvider} disabled={invitingProvider||!providerEmail.trim()} className="mt-2 rounded-lg border border-[#B9DDD7] bg-[#F3FAF8] px-3 py-2 text-[10px] font-medium text-[#167D73] disabled:opacity-50">{invitingProvider?"Creating secure link…":"Create provider access link"}</button>
              {providerInviteUrl&&<div className="mt-3 rounded-lg bg-[#F7F9F9] p-3"><p className="text-[10px] text-[#71859A]">Share this one-time link with the provider. It expires in 7 days.</p><div className="mt-2 flex gap-2"><input readOnly value={providerInviteUrl} className="min-w-0 flex-1 rounded-lg border border-[#DDE5EA] bg-white px-2 py-2 text-[10px] text-[#526A7D]"/><button onClick={()=>navigator.clipboard?.writeText(providerInviteUrl)} className="rounded-lg bg-[#173454] px-3 py-2 text-[10px] font-medium text-white">Copy</button></div></div>}
            </div><div className="mt-4 flex flex-col gap-2">{selected.application_id&&<Link href={"/employer/applicants/"+selected.application_id} className="rounded-xl border border-[#DDE5EA] px-3 py-2.5 text-center text-xs text-[#526A7D]">Open applicant</Link>}{selected.report_url&&<a href={selected.report_url} target="_blank" rel="noreferrer" className="rounded-xl bg-[#167D73] px-3 py-2.5 text-center text-xs font-medium text-white">Open provider report</a>}</div>
          </aside>
          <section className="p-5 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-[#173454]">Provider results</p><p className="mt-1 text-[11px] text-[#71859A]">HRANITI displays the provider-reported status and report information. It does not perform the verification.</p></div><span className={"rounded-full px-2.5 py-1 text-[10px] font-medium "+tone(selected.status)}>{selected.status}</span></div>
<div className="mt-4 space-y-2">{selectedItems.map(i=><div key={i.id} className="rounded-xl border border-[#DDE5EA] bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold text-[#173454]">{i.check_type}</p><p className="mt-1 text-[10px] text-[#71859A]">{i.provider||selected.verification_method}</p></div><select value={i.status} disabled={selected.verification_method!=="Internal"} onChange={e=>updateItem(i.id,{status:e.target.value})} className={"h-9 rounded-lg border border-[#DDE5EA] bg-white px-2 text-[10px] font-medium "+itemTone(i.status)}><option>Pending</option><option>Requested</option><option>In progress</option><option>Clear</option><option>Needs review</option><option>Unable to verify</option><option>Not applicable</option></select></div><textarea value={i.result_summary??""} disabled rows={2} className="mt-3 w-full rounded-lg border border-[#EEF2F4] bg-[#FCFCFA] p-2.5 text-[11px] outline-none" placeholder="Result summary / evidence note…"/>
{i.status==="Unable to verify" && <textarea value={i.unable_to_proceed_reason??""} disabled={selected.verification_method!=="Internal"} onChange={e=>updateItem(i.id,{unable_to_proceed_reason:e.target.value})} rows={2} className="mt-2 w-full rounded-lg border border-[#E9D9B5] bg-[#FFF9ED] p-2.5 text-[11px] outline-none" placeholder="Why this check cannot be verified…"/>}</div>)}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Provider case</p><p className="mt-1 text-xs text-[#526A7D]">{selected.provider_case_id||"Not available"}</p></div><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Last provider update</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.last_provider_update_at)}</p></div></div>{selected.report_url&&<div className="mt-3 rounded-xl border border-[#B9DDD7] bg-[#F3FAF8] p-4"><p className="text-xs font-semibold text-[#173454]">Provider report available</p><a href={selected.report_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg bg-[#167D73] px-3 py-2 text-[10px] font-medium text-white">Open provider report</a></div>}<div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">TAT</p><p className="mt-1 text-xs text-[#526A7D]">{tatLabel(selected)}</p><p className="mt-1 text-[10px] text-[#71859A]">Due {date(selected.tat_due_at||selected.due_at)}</p><p className={"mt-1 text-[10px] "+(tatJoiningWarning(selected)?.startsWith("TAT")?"text-[#B34E3E]":"text-[#71859A]")}>{tatJoiningWarning(selected)||"—"}</p></div><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Joining date</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.joining_date)}</p><p className="mt-1 text-[10px] text-[#71859A]">{joiningGapText(selected)}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Requested</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.requested_at)}</p></div><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Completed</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.completed_at)}</p></div></div>
            {selected.verification_method==="Internal"&&<div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-xs font-semibold text-[#173454]">Internal verification controls</p><div className="mt-3 flex items-center gap-3"><label className="text-[10px] font-medium text-[#526A7D]">Candidate consent</label><select value={selected.consent_status||"Not requested"} onChange={async e=>{const v=e.target.value;const patch:any={consent_status:v,consent_at:v==="Granted"?new Date().toISOString():null,updated_at:new Date().toISOString()};const {data,error}=await supabase.from("background_checks").update(patch).eq("id",selected.id).select("*").single();if(error||!data){setMessage(error?.message||"Could not update consent.");return}await supabase.from("background_check_events").insert({background_check_id:selected.id,company_id:companyId,event_type:"bgv_consent_updated",metadata:{consent_status:v}});setSelected(data as Check);setChecks(x=>x.map(c=>c.id===selected.id?data as Check:c));}} className="h-8 rounded-lg border border-[#DDE5EA] bg-white px-2 text-[10px]"><option>Not requested</option><option>Requested</option><option>Granted</option><option>Declined</option><option>Expired</option></select></div><div className="mt-3 flex flex-wrap gap-2">{["In progress","Clear","Unable to proceed","Cancelled"].map(v=><button key={v} onClick={async()=>{if(v==="Unable to proceed"&&!unableReason.trim()){setMessage("Enter a reason before marking the verification unable to proceed.");return}const now=new Date().toISOString();const patch:any={status:v,unable_to_proceed_reason:unableReason.trim()||null,updated_at:now};if(v==="Clear")patch.completed_at=now;if(v==="Cancelled")patch.stopped_at=now;const {data,error}=await supabase.from("background_checks").update(patch).eq("id",selected.id).select("*").single();if(error||!data){setMessage(error?.message||"Could not update.");return}await supabase.from("background_check_events").insert({background_check_id:selected.id,company_id:companyId,event_type:"internal_bgv_updated",metadata:{status:v,reason:unableReason.trim()||null}});setSelected(data as Check);setChecks(x=>x.map(c=>c.id===selected.id?data as Check:c));setMessage("Internal verification updated.");}} className="rounded-lg border border-[#DDE5EA] bg-white px-3 py-2 text-[10px] text-[#526A7D]">{v}</button>)}</div><textarea value={unableReason||selected.unable_to_proceed_reason||""} onChange={e=>setUnableReason(e.target.value)} rows={2} className="mt-3 w-full rounded-lg border border-[#DDE5EA] p-3 text-[11px]" placeholder="Reason if the verification cannot proceed…"/><div className="mt-4 border-t border-[#E6ECEF] pt-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Email candidate</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={emailTo||selected.candidate_email||""} onChange={e=>setEmailTo(e.target.value)} className="h-9 rounded-lg border border-[#DDE5EA] px-3 text-[11px]" placeholder="Recipient"/><input value={emailSubject} onChange={e=>setEmailSubject(e.target.value)} className="h-9 rounded-lg border border-[#DDE5EA] px-3 text-[11px]" placeholder="Subject"/></div><textarea value={emailMessage} onChange={e=>setEmailMessage(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[#DDE5EA] p-3 text-[11px]" placeholder="Message to candidate"/><p className="mt-2 text-[10px] text-[#9AA8B3]">Email sending will use the configured HRANITI email provider.</p><button onClick={async()=>{if(!emailTo.trim()||!emailMessage.trim()){setMessage("Recipient and message are required.");return}const {data:{session}}=await supabase.auth.getSession();if(!session){setMessage("Your session has expired.");return}setSendingEmail(true);const r=await fetch("/api/bgv/provider/invite",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({action:"email",backgroundCheckId:selected.id,to:emailTo,subject:emailSubject||"Background verification update",message:emailMessage})});const b=await r.json().catch(()=>({}));setSendingEmail(false);setMessage(r.ok?"Email sent.":(b.error||"Could not send email."));}} disabled={sendingEmail} className="mt-2 rounded-lg bg-[#173454] px-3 py-2 text-[10px] font-medium text-white">{sendingEmail?"Sending…":"Send email"}</button></div></div>}
{selected.verification_method==="Provider"&&<div className="mt-4 flex flex-wrap gap-2"><button onClick={async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session){setMessage("Your session has expired.");return}const r=await fetch("/api/bgv/provider/invite",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({action:"followup",backgroundCheckId:selected.id})});const b=await r.json().catch(()=>({}));setMessage(r.ok?"Follow-up sent to the provider.":(b.error||"Could not send provider follow-up."));}} className="rounded-lg border border-[#B9DDD7] bg-[#F3FAF8] px-3 py-2 text-[10px] font-medium text-[#167D73]">Follow up provider</button></div>}{selected.verification_method==="Provider"&&["Requested","In progress","Needs attention"].includes(selected.status)&&<div className="mt-5 rounded-2xl border border-[#E9D9B5] bg-[#FFF9ED] p-4"><p className="text-xs font-semibold text-[#7A5B1A]">Need the provider to stop?</p><p className="mt-1 text-[10px] leading-4 text-[#7A5B1A]">If the candidate declines the offer or the employer changes course, record the reason and request the provider to stop. The provider must acknowledge the request.</p><textarea value={stopReason} onChange={e=>setStopReason(e.target.value)} rows={2} className="mt-3 w-full rounded-lg border border-[#E9D9B5] bg-white p-3 text-[11px]" placeholder="Reason for stopping the BGV…"/><button onClick={async()=>{if(!stopReason.trim()){setMessage("Enter why the provider should stop this verification.");return}const {data:{session}}=await supabase.auth.getSession();if(!session){setMessage("Your session has expired.");return}const r=await fetch("/api/bgv/provider/invite",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({action:"stop",backgroundCheckId:selected.id,reason:stopReason.trim()})});const b=await r.json().catch(()=>({}));if(!r.ok){setMessage(b.error||"Could not request the provider to stop.");return}setSelected(b.check as Check);setChecks(x=>x.map(c=>c.id===selected.id?b.check as Check:c));setStopReason("");setMessage(b.emailSent?"Stop request recorded and emailed to the provider.":"Stop request recorded; provider must acknowledge it.");}} className="mt-2 rounded-lg bg-[#7A5B1A] px-3 py-2 text-[10px] font-medium text-white">Request provider to stop</button></div>}
{selected.stop_request_status==="Requested"&&<div className="mt-3 rounded-xl border border-[#E9D9B5] bg-[#FFF9ED] p-3 text-[11px] text-[#7A5B1A]">Stop requested. Waiting for provider acknowledgement. Reason: {selected.stop_reason||"—"}</div>}
{selected.status==="Unable to proceed"&&<div className="mt-3 rounded-xl border border-[#E9D9B5] bg-[#FFF9ED] p-3 text-[11px] text-[#7A5B1A]"><strong>Unable to proceed:</strong> {selected.unable_to_proceed_reason||"Reason not recorded."}</div>}{selected.overall_note&&<div className="mt-4 rounded-xl border border-[#DDE5EA] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Internal note</p><p className="mt-1 text-xs leading-5 text-[#526A7D]">{selected.overall_note}</p></div>}
            {message&&<div className="mt-4 rounded-xl border border-[#B9DDD7] bg-[#F3FAF8] px-4 py-3 text-xs text-[#167D73]">{message}</div>}
          </section>
        </div>}
      </div>
    </div>}
  </EmployerShell>;
}
