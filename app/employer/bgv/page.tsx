"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ClipboardCheck, FileCheck2, Filter, Plus, Search, ShieldCheck, UserRound, X } from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type Job = { id:string; title:string; location:string|null; };
type Application = { id:string; user_id:string; job_id:string; status:string|null; pipeline_stage:string|null; };
type Profile = { id:string; full_name:string|null; email:string|null; current_location:string|null; };
type Offer = { id:string; application_id:string|null; candidate_name:string|null; candidate_email:string|null; job_title:string|null; status:string|null; };
type Check = {
  id:string; application_id:string|null; offer_id:string|null; candidate_name:string; candidate_email:string|null;
  job_title:string|null; status:string; package_name:string; verification_method:string;
  requested_at:string|null; due_at:string|null; completed_at:string|null; overall_note:string|null;
  consent_status:string; consent_at:string|null; jurisdiction:string|null; legal_basis:string|null; retention_until:string|null;
};
type Item = { id:string; background_check_id:string; check_type:string; status:string; provider:string|null; result_summary:string|null; reviewer_note:string|null; completed_at:string|null; };

const CHECK_TYPES = ["Identity","Address","Employment","Education","Criminal","Reference","Right to work","Professional licence"];
const STATUS = ["All","Not started","Requested","In progress","Needs attention","Clear","Consider","Failed","Cancelled"];

function tone(s:string) {
  if (s==="Clear") return "bg-[#E7F3F1] text-[#167D73]";
  if (s==="In progress" || s==="Requested") return "bg-[#EDF5FF] text-[#3D6F9E]";
  if (s==="Needs attention" || s==="Consider") return "bg-[#FFF7E6] text-[#8A641E]";
  if (s==="Failed" || s==="Cancelled") return "bg-[#FFF1EE] text-[#B34E3E]";
  return "bg-[#F5F7F7] text-[#71859A]";
}
function itemTone(s:string) {
  if (s==="Clear") return "bg-[#E7F3F1] text-[#167D73]";
  if (s==="In progress" || s==="Requested") return "bg-[#EDF5FF] text-[#3D6F9E]";
  if (s==="Needs review" || s==="Unable to verify") return "bg-[#FFF7E6] text-[#8A641E]";
  return "bg-[#F5F7F7] text-[#71859A]";
}
function date(v:string|null) { return v ? new Date(v).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"; }

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
  const [packageName,setPackageName]=useState("Standard");
  const [method,setMethod]=useState("Manual");
  const [dueDate,setDueDate]=useState("");
  const [jurisdiction,setJurisdiction]=useState("India");
  const [legalBasis,setLegalBasis]=useState("Contract / pre-contract");
  const [consent,setConsent]=useState("Not requested");
  const [retentionUntil,setRetentionUntil]=useState("");
  const [types,setTypes]=useState<string[]>(["Identity","Address","Employment","Education","Criminal"]);
  const [note,setNote]=useState("");
  const [saving,setSaving]=useState(false);
  const [requestedApplication,setRequestedApplication]=useState<string | null>(null);

  async function load() {
    setLoading(true);
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setLoading(false);return}
    const company=await getOrCreateCompanyId(supabase,user);
    setCompanyId(company);
    const [{data:cd},{data:jd},{data:od}] = await Promise.all([
      supabase.from("background_checks").select("id,application_id,offer_id,candidate_name,candidate_email,job_title,status,package_name,verification_method,requested_at,due_at,completed_at,overall_note,consent_status,consent_at,jurisdiction,legal_basis,retention_until").eq("company_id",company).order("created_at",{ascending:false}),
      supabase.from("jobs").select("id,title,location").eq("company_id",company).order("created_at",{ascending:false}),
      supabase.from("offers").select("id,application_id,candidate_name,candidate_email,job_title,status").eq("company_id",company).in("status",["Accepted","Sent","Approved"]).order("created_at",{ascending:false})
    ]);
    const cs=(cd??[]) as Check[]; setChecks(cs);
    setJobs((jd??[]) as Job[]);
    setOffers((od??[]) as Offer[]);
    const appsIds=[...new Set(cs.map(c=>c.application_id).filter(Boolean) as string[]),...(od??[]).map(o=>o.application_id).filter(Boolean) as string[]];
    const appsResult=appsIds.length ? await supabase.from("applications").select("id,user_id,job_id,status,pipeline_stage").in("id",appsIds) : {data:[]};
    const apps=(appsResult.data??[]) as Application[]; setApplications(apps);
    const userIds=[...new Set(apps.map(a=>a.user_id).filter(Boolean))];
    if(userIds.length){const p=await supabase.from("profiles").select("id,full_name,email,current_location").in("id",userIds);const m:Record<string,Profile>={};for(const x of (p.data??[]) as Profile[])m[x.id]=x;setProfiles(m)}
    const ids=cs.map(c=>c.id);
    if(ids.length){const ir=await supabase.from("background_check_items").select("id,background_check_id,check_type,status,provider,result_summary,reviewer_note,completed_at").in("background_check_id",ids);setItems((ir.data??[]) as Item[])}
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

  const demoCandidate={id:"demo-candidate-1",name:"Aarav Mehta",email:"aarav.mehta@example.com",job:jobs[0]??null};\n  useEffect(()=>{ if(requestedApplication && applications.some(a=>a.id===requestedApplication)){ openNew(); setCandidateId(requestedApplication); setRequestedApplication(null); } },[applications,requestedApplication]);

  function openNew(source?:Check|null, demo=false) {
    setSelected(source??null);
    setMessage("");
    if(source){
      const app=applications.find(a=>a.id===source.application_id);
      setCandidateId(app?.id ?? "");
      setJobId(app?.job_id ?? jobs.find(j=>j.title===source.job_title)?.id ?? "");
      setPackageName(source.package_name); setMethod(source.verification_method); setDueDate(source.due_at?.slice(0,10)??"");
      setJurisdiction(source.jurisdiction??"India"); setLegalBasis(source.legal_basis??"Contract / pre-contract"); setConsent(source.consent_status); setRetentionUntil(source.retention_until??""); setNote(source.overall_note??"");
      setTimeout(()=>loadItems(source.id),0);
    } else {
      setCandidateId(demo ? "demo-candidate-1" : "");
      setJobId(demo ? (jobs[0]?.id??"") : "");
      setPackageName("Standard"); setMethod("Manual"); setDueDate(""); setJurisdiction("India"); setLegalBasis("Contract / pre-contract"); setConsent("Not requested"); setRetentionUntil(""); setNote("");
      setTypes(["Identity","Address","Employment","Education","Criminal"]);
      setSelectedItems([]);
    }
    setOpen(true);
  }

  async function loadItems(id:string) {
    const {data}=await supabase.from("background_check_items").select("id,background_check_id,check_type,status,provider,result_summary,reviewer_note,completed_at").eq("background_check_id",id);
    setSelectedItems((data??[]) as Item[]);
  }

  function applicantLabel(a:Application) {
    const p=profiles[a.user_id]; const j=jobs.find(x=>x.id===a.job_id);
    return (p?.full_name??"Candidate")+" · "+(j?.title??"Role");
  }

  async function createCheck() {
    setSaving(true); setMessage("");
    let name="",email:string|null=null,role="";
    let applicationId:string|null=null,offerId:string|null=null;
    if(candidateId==="demo-candidate-1"){name=demoCandidate.name;email=demoCandidate.email;role=demoCandidate.job?.title??"Sample role";}
    else {
      const a=applications.find(x=>x.id===candidateId); const p=a?profiles[a.user_id]:undefined; const j=a?jobs.find(x=>x.id===a.job_id):undefined;
      if(!a||!p){setMessage("Choose an applicant.");setSaving(false);return}
      name=p.full_name??"Candidate"; email=p.email; role=j?.title??"Role"; applicationId=a.id;
      const offer=offers.find(o=>o.application_id===a.id); offerId=offer?.id??null;
    }
    if(!types.length){setMessage("Select at least one verification.");setSaving(false);return}
    const now=new Date().toISOString();
    const {data,error}=await supabase.from("background_checks").insert({
      company_id:companyId,application_id:applicationId,offer_id:offerId,candidate_name:name,candidate_email:email,job_title:role,
      status:"Requested",package_name:packageName,verification_method:method,requested_at:now,due_at:dueDate?new Date(dueDate+"T23:59:59").toISOString():null,
      consent_status:consent,jurisdiction:jurisdiction||null,legal_basis:legalBasis||null,retention_until:retentionUntil||null,overall_note:note||null
    }).select("id,application_id,offer_id,candidate_name,candidate_email,job_title,status,package_name,verification_method,requested_at,due_at,completed_at,overall_note,consent_status,consent_at,jurisdiction,legal_basis,retention_until").single();
    if(error||!data){setMessage(error?.message??"Could not create the verification request.");setSaving(false);return}
    const rows=types.map(t=>({background_check_id:data.id,company_id:companyId,check_type:t,status:consent==="Granted"?"Requested":"Pending",requested_at:consent==="Granted"?now:null}));
    const ir=await supabase.from("background_check_items").insert(rows);
    if(ir.error){await supabase.from("background_checks").update({status:"Cancelled",overall_note:"Could not create all verification items: "+ir.error.message}).eq("id",data.id);setMessage(ir.error.message);setSaving(false);return}
    await supabase.from("background_check_events").insert({background_check_id:data.id,company_id:companyId,event_type:"verification_requested",metadata:{package:packageName,check_types:types,consent_status:consent}});
    if(applicationId) await supabase.from("applications").update({next_step:"Complete pre-employment checks",updated_at:now}).eq("id",applicationId);
    setChecks(x=>[data as Check,...x]); await load(); setSelected(data as Check); await loadItems(data.id); setOpen(true); setMessage("Background verification request created."); setSaving(false);
  }

  async function updateCheck(patch:Partial<Check>) {
    if(!selected)return;
    const {data,error}=await supabase.from("background_checks").update({...patch,updated_at:new Date().toISOString()}).eq("id",selected.id).select("id,application_id,offer_id,candidate_name,candidate_email,job_title,status,package_name,verification_method,requested_at,due_at,completed_at,overall_note,consent_status,consent_at,jurisdiction").single();
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

  async function markConsent(value:string) {
    await updateCheck({consent_status:value,consent_at:value==="Granted"?new Date().toISOString():null});
    if(value==="Granted"){
      const now=new Date().toISOString();
      const pending=selectedItems.filter(i=>i.status==="Pending");
      for(const i of pending) await supabase.from("background_check_items").update({status:"Requested",requested_at:now,updated_at:now}).eq("id",i.id);
      await loadItems(selected!.id);
    }
  }

  async function cancel() {
    if(!selected)return;
    await updateCheck({status:"Cancelled"});
  }

  return <EmployerShell>
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73]">HIRING</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#173454]">Background Verification</h1><p className="mt-2 max-w-2xl text-sm text-[#71859A]">Run pre-employment checks with clear consent, ownership and an auditable status for every candidate.</p></div>
        <div className="flex gap-2"><button onClick={()=>openNew()} className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white"><Plus size={15}/> New verification</button><button onClick={()=>openNew(null,true)} className="rounded-xl border border-[#B9DDD7] bg-white px-4 py-2.5 text-xs font-medium text-[#167D73]">Preview sample</button></div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Active",counts.active,"Requests moving through verification"],["Needs attention",counts.attention,"Results requiring review"],["Clear",counts.clear,"Checks completed clear"],["Total",counts.total,"All verification cases"]].map(([label,count,sub])=><div key={String(label)} className="rounded-2xl border border-[#DDE5EA] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A99A5]">{label}</p><p className="mt-2 text-2xl font-semibold text-[#173454]">{count}</p><p className="mt-1 text-[11px] text-[#71859A]">{sub}</p></div>)}
      </div>

      <div className="mt-6 rounded-2xl border border-[#DDE5EA] bg-white p-3"><div className="flex flex-col gap-2 lg:flex-row"><div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#F7F9F9] px-3"><Search size={15} className="text-[#8A99A5]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search candidate, role or verification…" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#9AA8B3]"/></div><div className="relative"><Filter size={13} className="pointer-events-none absolute left-3 top-3.5 text-[#8A99A5]"/><select value={filter} onChange={e=>setFilter(e.target.value)} className="h-10 appearance-none rounded-xl border border-[#DDE5EA] bg-white pl-8 pr-9 text-xs text-[#526A7D] outline-none">{STATUS.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-3 top-3.5 text-[#8A99A5]"/></div></div></div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white">
        <div className="hidden grid-cols-[minmax(230px,1.4fr)_1fr_.8fr_.8fr_.8fr_30px] gap-3 border-b border-[#EEF2F4] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A99A5] md:grid"><span>Candidate</span><span>Role</span><span>Status</span><span>Consent</span><span>Due</span><span/></div>
        {loading?<div className="px-5 py-16 text-center text-sm text-[#71859A]">Loading verification cases…</div>:rows.length===0?<div className="p-12 text-center"><ShieldCheck className="mx-auto text-[#9AA8B3]" size={26}/><p className="mt-3 text-sm font-medium text-[#173454]">No background checks yet</p><p className="mt-1 text-xs text-[#71859A]">Start from an accepted offer or create a sample verification to explore the workflow.</p><button onClick={()=>openNew(null,true)} className="mt-4 rounded-xl border border-[#B9DDD7] px-4 py-2 text-xs font-medium text-[#167D73]">Preview sample</button></div>:
        rows.map(c=><button key={c.id} onClick={()=>openNew(c)} className="grid w-full gap-3 border-b border-[#EEF2F4] px-5 py-4 text-left hover:bg-[#FCFDFD] md:grid-cols-[minmax(230px,1.4fr)_1fr_.8fr_.8fr_.8fr_30px] md:items-center"><span><span className="block text-sm font-medium text-[#173454]">{c.candidate_name}</span><span className="mt-1 block truncate text-[11px] text-[#71859A]">{c.candidate_email||"Email not provided"} · {c.package_name}</span></span><span className="text-xs text-[#526A7D]">{c.job_title||"Role"}</span><span><span className={"rounded-full px-2.5 py-1 text-[10px] font-medium "+tone(c.status)}>{c.status}</span></span><span className="text-xs text-[#526A7D]">{c.consent_status}</span><span className="text-xs text-[#71859A]">{date(c.due_at)}</span><ArrowRight size={15} className="text-[#9AA8B3]"/></button>)}
      </div>

      <div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><div className="flex gap-3"><ClipboardCheck size={18} className="mt-0.5 text-[#167D73]"/><div><p className="text-xs font-semibold text-[#173454]">Connected hiring flow</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">Accepted offer → consent → verification requests → review → Clear / Needs attention → Hires. A clear BGV does not automatically mark someone hired.</p></div></div></div>
    </div>

    {open&&<div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 p-4 sm:p-7">
      <div className="mx-auto max-w-[1180px] rounded-2xl bg-white shadow-[0_24px_80px_rgba(23,52,84,0.2)]">
        <div className="flex items-center justify-between border-b border-[#E6ECEF] px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#167D73]">{selected?"VERIFICATION CASE":"NEW VERIFICATION"}</p><h2 className="mt-1 text-lg font-semibold text-[#173454]">{selected?.candidate_name??(candidateId==="demo-candidate-1"?demoCandidate.name:"Create background verification")}</h2></div><button onClick={()=>setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71859A] hover:bg-[#F5F7F7]"><X size={18}/></button></div>

        {!selected?<div className="grid lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
            <label className="block text-xs font-medium text-[#526A7D]">Applicant</label>
            <select value={candidateId} onChange={e=>setCandidateId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs outline-none"><option value="">Select applicant</option><option value="demo-candidate-1">Aarav Mehta · Sample candidate</option>{applications.map(a=><option key={a.id} value={a.id}>{applicantLabel(a)}</option>)}</select>
            <p className="mt-2 text-[10px] leading-4 text-[#9AA8B3]">For a real case, use the applicant linked to the accepted offer. The sample candidate is stored without a personal account.</p>
            <label className="mt-5 block text-xs font-medium text-[#526A7D]">Verification package</label>
            <select value={packageName} onChange={e=>setPackageName(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs"><option>Standard</option><option>India — Standard</option><option>Global — Standard</option><option>Custom</option></select>
            <div className="mt-5"><p className="text-xs font-medium text-[#526A7D]">Checks</p><div className="mt-2 grid grid-cols-2 gap-2">{CHECK_TYPES.map(t=><label key={t} className="flex items-center gap-2 rounded-xl border border-[#EEF2F4] px-3 py-2.5 text-[11px] text-[#526A7D]"><input type="checkbox" checked={types.includes(t)} onChange={e=>setTypes(v=>e.target.checked?[...v,t]:v.filter(x=>x!==t))} className="accent-[#167D73]"/>{t}</label>)}</div></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-[#526A7D]">Due date</label><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs"/></div><div><label className="block text-xs font-medium text-[#526A7D]">Jurisdiction</label><select value={jurisdiction} onChange={e=>setJurisdiction(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-2 text-xs"><option>India</option><option>United States</option><option>European Union</option><option>United Kingdom</option><option>UAE</option><option>Singapore</option><option>Other</option></select></div></div>
            <label className="mt-4 block text-xs font-medium text-[#526A7D]">Verification method</label><select value={method} onChange={e=>setMethod(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs"><option>Manual</option><option>External provider</option></select>
            <label className="mt-4 block text-xs font-medium text-[#526A7D]">Lawful basis</label><select value={legalBasis} onChange={e=>setLegalBasis(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs"><option>Contract / pre-contract</option><option>Legal obligation</option><option>Legitimate interests</option><option>Consent</option><option>Other</option></select><label className="mt-4 block text-xs font-medium text-[#526A7D]">Candidate authorization</label><select value={consent} onChange={e=>setConsent(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs"><option>Not requested</option><option>Requested</option><option>Granted</option><option>Declined</option><option>Expired</option></select><label className="mt-4 block text-xs font-medium text-[#526A7D]">Retention until</label><input type="date" value={retentionUntil} onChange={e=>setRetentionUntil(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs"/>
            <label className="mt-4 block text-xs font-medium text-[#526A7D]">Internal note</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs outline-none" placeholder="Private verification context…"/>
          </aside>
          <section className="p-5 sm:p-7"><div className="rounded-2xl border border-[#DDE5EA] bg-[#FCFCFA] p-5"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[#167D73]"/><div><p className="text-sm font-semibold text-[#173454]">Consent before verification</p><p className="mt-1 text-xs leading-5 text-[#71859A]">Keep consent status explicit. Verification requests remain pending until consent is granted.</p></div></div></div><div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><p className="text-xs font-semibold text-[#173454]">Selected checks</p><div className="mt-3 space-y-2">{types.map(t=><div key={t} className="flex items-center justify-between rounded-xl bg-[#F7F9F9] px-3 py-2.5"><span className="text-xs text-[#526A7D]">{t}</span><Check size={14} className="text-[#167D73]"/></div>)}</div></div><div className="mt-5 flex justify-end gap-2 border-t border-[#E6ECEF] pt-5"><button onClick={()=>setOpen(false)} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Cancel</button><button onClick={createCheck} disabled={saving} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white">{saving?"Creating…":"Create verification"}</button></div>{message&&<p className="mt-3 text-right text-xs text-[#167D73]">{message}</p>}</section>
        </div>:
        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F3F1] text-[#167D73]"><UserRound size={18}/></span><div><p className="text-sm font-semibold text-[#173454]">{selected.candidate_name}</p><p className="text-[11px] text-[#71859A]">{selected.candidate_email||"Email not provided"}</p></div></div>
            <div className="mt-5 space-y-3"><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Role</p><p className="mt-1 text-xs text-[#526A7D]">{selected.job_title||"—"}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Package</p><p className="mt-1 text-xs text-[#526A7D]">{selected.package_name} · {selected.verification_method}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Due</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.due_at)}</p></div></div>
            <div className="mt-6 rounded-2xl bg-[#F7F9F9] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Consent</p><div className="mt-2 flex items-center gap-2"><span className={"rounded-full px-2.5 py-1 text-[10px] font-medium "+tone(selected.consent_status)}>{selected.consent_status}</span></div><div className="mt-3 flex flex-wrap gap-2">{selected.consent_status!=="Granted"&&<button onClick={()=>markConsent("Granted")} className="rounded-lg bg-[#167D73] px-3 py-2 text-[10px] font-medium text-white">Mark granted</button>}<button onClick={()=>markConsent("Requested")} className="rounded-lg border border-[#DDE5EA] bg-white px-3 py-2 text-[10px] text-[#526A7D]">Mark requested</button></div></div>
            <div className="mt-4 flex flex-col gap-2">{selected.status!=="Cancelled"&&<button onClick={cancel} className="rounded-xl border border-[#F0D5CF] px-3 py-2.5 text-xs text-[#B34E3E]">Cancel verification</button>}{selected.application_id&&<Link href={"/employer/applicants/"+selected.application_id} className="rounded-xl border border-[#DDE5EA] px-3 py-2.5 text-center text-xs text-[#526A7D]">Open applicant</Link>}</div>
          </aside>
          <section className="p-5 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-[#173454]">Verification checks</p><p className="mt-1 text-[11px] text-[#71859A]">Update each check as evidence is reviewed. Overall status follows the item results.</p></div><span className={"rounded-full px-2.5 py-1 text-[10px] font-medium "+tone(selected.status)}>{selected.status}</span></div>
            <div className="mt-4 space-y-2">{selectedItems.map(i=><div key={i.id} className="rounded-xl border border-[#DDE5EA] bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold text-[#173454]">{i.check_type}</p><p className="mt-1 text-[10px] text-[#71859A]">{i.provider||"Manual verification"}</p></div><select value={i.status} onChange={e=>updateItem(i.id,{status:e.target.value,completed_at:["Clear","Needs review","Unable to verify","Not applicable"].includes(e.target.value)?new Date().toISOString():null})} className={"h-9 rounded-lg border border-[#DDE5EA] bg-white px-2 text-[10px] font-medium "+itemTone(i.status)}><option>Pending</option><option>Requested</option><option>In progress</option><option>Clear</option><option>Needs review</option><option>Unable to verify</option><option>Not applicable</option></select></div><textarea value={i.result_summary??""} onChange={e=>setSelectedItems(x=>x.map(v=>v.id===i.id?{...v,result_summary:e.target.value}:v))} onBlur={e=>updateItem(i.id,{result_summary:e.target.value})} rows={2} className="mt-3 w-full rounded-lg border border-[#EEF2F4] bg-[#FCFCFA] p-2.5 text-[11px] outline-none" placeholder="Result summary / evidence note…"/></div>)}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Requested</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.requested_at)}</p></div><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Completed</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.completed_at)}</p></div></div>
            {selected.overall_note&&<div className="mt-4 rounded-xl border border-[#DDE5EA] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Internal note</p><p className="mt-1 text-xs leading-5 text-[#526A7D]">{selected.overall_note}</p></div>}
            {message&&<div className="mt-4 rounded-xl border border-[#B9DDD7] bg-[#F3FAF8] px-4 py-3 text-xs text-[#167D73]">{message}</div>}
          </section>
        </div>}
      </div>
    </div>}
  </EmployerShell>;
}
