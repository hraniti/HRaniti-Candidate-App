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
  job_title:string|null; status:string; package_name?:string; verification_method?:string; provider_name:string|null; provider_case_id:string|null; provider_org_id:string|null; provider_status:string|null; report_url:string|null; report_received_at:string|null; last_provider_update_at:string|null; verification_method:string; unable_to_proceed_reason:string|null; stop_request_status:string; stop_requested_at:string|null; stop_reason:string|null; stopped_at:string|null;
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
      supabase.from("background_checks").select("id,application_id,offer_id,candidate_name,candidate_email,job_title,status,provider_name,provider_case_id,provider_org_id,provider_status,report_url,report_received_at,last_provider_update_at,requested_at,due_at,completed_at,overall_note,consent_status,consent_at,jurisdiction,legal_basis,retention_until").eq("company_id",company).order("created_at",{ascending:false}),
      supabase.from("jobs").select("id,title,location").eq("company_id",company).order("created_at",{ascending:false}),
      supabase.from("offers").select("id,application_id,candidate_name,candidate_email,job_title,status").eq("company_id",company).in("status",["Accepted","Sent","Approved"]).order("created_at",{ascending:false})
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

  const demoCandidate={id:"demo-candidate-1",name:"Aarav Mehta",email:"aarav.mehta@example.com",job:jobs[0]??null};
  useEffect(()=>{ if(access==="initiate" && requestedApplication && applications.some(a=>a.id===requestedApplication)){ openNew(); setCandidateId(requestedApplication); setRequestedApplication(null); } },[applications,requestedApplication,access]);

  function openNew(source?:Check|null, demo=false) {
    setSelected(source??null);
    setMessage("");
    if(source){
      const app=applications.find(a=>a.id===source.application_id);
      setCandidateId(app?.id ?? "");
      setJobId(app?.job_id ?? jobs.find(j=>j.title===source.job_title)?.id ?? "");
      setDueDate(source.due_at?.slice(0,10)??""); setNote(source.overall_note??"");
      setTimeout(()=>loadItems(source.id),0);
    } else {
      setCandidateId(demo ? "demo-candidate-1" : "");
      setJobId(demo ? (jobs[0]?.id??"") : "");
      setDueDate(""); setProviderName(""); setProviderCaseId(""); setNote("");
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
    if(candidateId==="demo-candidate-1"){name=demoCandidate.name;email=demoCandidate.email;role=demoCandidate.job?.title??"Sample role";}
    else {
      const a=applications.find(x=>x.id===candidateId); const p=a?profiles[a.user_id]:undefined; const j=a?jobs.find(x=>x.id===a.job_id):undefined;
      if(!a||!p){setMessage("Choose an applicant.");setSaving(false);return}
      name=p.full_name??"Candidate"; email=p.email; role=j?.title??"Role"; applicationId=a.id;
      const offer=offers.find(o=>o.application_id===a.id); offerId=offer?.id??null;
    }
    const now=new Date().toISOString();
    const {data,error}=await supabase.from("background_checks").insert({
      company_id:companyId,application_id:applicationId,offer_id:offerId,candidate_name:name,candidate_email:email,job_title:role,
      status:"In progress",provider_name:providerName.trim()||null,provider_case_id:providerCaseId.trim()||null,requested_at:now,due_at:dueDate?new Date(dueDate+"T23:59:59").toISOString():null,
      consent_status:"Not applicable",jurisdiction:null,legal_basis:null,retention_until:null,overall_note:note||null
    }).select("id,application_id,offer_id,candidate_name,candidate_email,job_title,status,provider_name,provider_case_id,provider_org_id,provider_status,report_url,report_received_at,last_provider_update_at,requested_at,due_at,completed_at,overall_note,consent_status,consent_at,jurisdiction,legal_basis,retention_until").single();
    if(error||!data){setMessage(error?.message??"Could not create the BGV case.");setSaving(false);return}
    await supabase.from("background_check_events").insert({background_check_id:data.id,company_id:companyId,event_type:"bgv_case_created",metadata:{source:"employer",note:note||null}});
    if(applicationId) await supabase.from("applications").update({next_step:"Background verification",updated_at:now}).eq("id",applicationId);
    await load(); setSelected(data as Check); await loadItems(data.id); setOpen(true); setMessage("BGV case created. Add the provider's current status and report details as they become available."); setSaving(false);
  }

  async function updateCheck(patch:Partial<Check>) {
    if(!selected)return;
    const {data,error}=await supabase.from("background_checks").update({...patch,updated_at:new Date().toISOString()}).eq("id",selected.id).select("id,application_id,offer_id,candidate_name,candidate_email,job_title,status,provider_name,provider_case_id,provider_org_id,provider_status,report_url,report_received_at,last_provider_update_at,requested_at,due_at,completed_at,overall_note,consent_status,consent_at,jurisdiction").single();
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
        <div className="flex gap-2"><button onClick={()=>openNew()} className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white"><Plus size={15}/> New verification</button><button onClick={()=>openNew(null,true)} className="rounded-xl border border-[#B9DDD7] bg-white px-4 py-2.5 text-xs font-medium text-[#167D73]">Preview sample</button></div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Active",counts.active,"Requests moving through verification"],["Needs attention",counts.attention,"Results requiring review"],["Clear",counts.clear,"Checks completed clear"],["Total",counts.total,"All verification cases"]].map(([label,count,sub])=><div key={String(label)} className="rounded-2xl border border-[#DDE5EA] bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A99A5]">{label}</p><p className="mt-2 text-2xl font-semibold text-[#173454]">{count}</p><p className="mt-1 text-[11px] text-[#71859A]">{sub}</p></div>)}
      </div>

      <div className="mt-6 rounded-2xl border border-[#DDE5EA] bg-white p-3"><div className="flex flex-col gap-2 lg:flex-row"><div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#F7F9F9] px-3"><Search size={15} className="text-[#8A99A5]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search candidate, role or verification…" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#9AA8B3]"/></div><div className="relative"><Filter size={13} className="pointer-events-none absolute left-3 top-3.5 text-[#8A99A5]"/><select value={filter} onChange={e=>setFilter(e.target.value)} className="h-10 appearance-none rounded-xl border border-[#DDE5EA] bg-white pl-8 pr-9 text-xs text-[#526A7D] outline-none">{STATUS.map(s=><option key={s}>{s}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-3 top-3.5 text-[#8A99A5]"/></div></div></div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white">
        <div className="hidden grid-cols-[minmax(230px,1.4fr)_1fr_.8fr_.8fr_.8fr_30px] gap-3 border-b border-[#EEF2F4] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A99A5] md:grid"><span>Candidate</span><span>Role</span><span>Status</span><span>Provider status</span><span>Due</span><span/></div>
        {loading?<div className="px-5 py-16 text-center text-sm text-[#71859A]">Loading verification cases…</div>:rows.length===0?<div className="p-12 text-center"><ShieldCheck className="mx-auto text-[#9AA8B3]" size={26}/><p className="mt-3 text-sm font-medium text-[#173454]">No background checks yet</p><p className="mt-1 text-xs text-[#71859A]">Start from an accepted offer or create a sample verification to explore the workflow.</p>{access==="initiate"&&<button onClick={()=>openNew(null,true)} className="mt-4 rounded-xl border border-[#B9DDD7] px-4 py-2 text-xs font-medium text-[#167D73]">Preview sample</button>}</div>:
        rows.map(c=><button key={c.id} onClick={()=>openNew(c)} className="grid w-full gap-3 border-b border-[#EEF2F4] px-5 py-4 text-left hover:bg-[#FCFDFD] md:grid-cols-[minmax(230px,1.4fr)_1fr_.8fr_.8fr_.8fr_30px] md:items-center"><span><span className="block text-sm font-medium text-[#173454]">{c.candidate_name}</span><span className="mt-1 block truncate text-[11px] text-[#71859A]">{c.candidate_email||"Email not provided"}</span></span><span className="text-xs text-[#526A7D]">{c.job_title||"Role"}</span><span><span className={"rounded-full px-2.5 py-1 text-[10px] font-medium "+tone(c.status)}>{c.status}</span></span><span className="text-xs text-[#526A7D]">{c.provider_status||c.status}</span><span className="text-xs text-[#71859A]">{date(c.due_at)}</span><ArrowRight size={15} className="text-[#9AA8B3]"/></button>)}
      </div>

      <div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><div className="flex gap-3"><ClipboardCheck size={18} className="mt-0.5 text-[#167D73]"/><div><p className="text-xs font-semibold text-[#173454]">Connected hiring flow</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">Employer initiates → BGV provider works the case → provider updates HRANITI → authorized employer team reviews. HRANITI does not perform or adjudicate the verification.</p></div></div></div>
    </div>

    {open&&access==="initiate"&&<div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 p-4 sm:p-7">
      <div className="mx-auto max-w-[1180px] rounded-2xl bg-white shadow-[0_24px_80px_rgba(23,52,84,0.2)]">
        <div className="flex items-center justify-between border-b border-[#E6ECEF] px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#167D73]">{selected?"BGV CASE":"LINK PROVIDER CASE"}</p><h2 className="mt-1 text-lg font-semibold text-[#173454]">{selected?.candidate_name??(candidateId==="demo-candidate-1"?demoCandidate.name:"Link provider case")}</h2></div><button onClick={()=>setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71859A] hover:bg-[#F5F7F7]"><X size={18}/></button></div>

        {!selected?<div className="grid lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
            <label className="block text-xs font-medium text-[#526A7D]">Applicant</label>
            <select value={candidateId} onChange={e=>setCandidateId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs outline-none"><option value="">Select applicant</option><option value="demo-candidate-1">Aarav Mehta · Sample candidate</option>{applications.map(a=><option key={a.id} value={a.id}>{applicantLabel(a)}</option>)}</select>
            <p className="mt-2 text-[10px] leading-4 text-[#9AA8B3]">For a real case, use the applicant linked to the accepted offer. The sample candidate is stored without a personal account.</p>
            <div className="mt-5 rounded-xl border border-[#DDE5EA] bg-[#F7F9F9] p-4"><p className="text-xs font-semibold text-[#173454]">What HRANITI does</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">HRANITI records the BGV case and shows the provider's status and report. The employer and its BGV provider handle the actual verification outside this workflow.</p></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-[#526A7D]">Provider name</label><input value={providerName} onChange={e=>setProviderName(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Provider name"/></div><div><label className="block text-xs font-medium text-[#526A7D]">Provider case ID</label><input value={providerCaseId} onChange={e=>setProviderCaseId(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Case reference"/></div></div><div className="mt-3"><label className="block text-xs font-medium text-[#526A7D]">Expected by <span className="font-normal text-[#9AA8B3]">(optional)</span></label><input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs"/></div>
            <label className="mt-4 block text-xs font-medium text-[#526A7D]">Internal note</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs outline-none" placeholder="Private verification context…"/>
          </aside>
          <section className="p-5 sm:p-7"><div className="rounded-2xl border border-[#DDE5EA] bg-[#F7F9F9] p-5"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[#167D73]"/><div><p className="text-sm font-semibold text-[#173454]">Provider-owned verification</p><p className="mt-1 text-xs leading-5 text-[#71859A]">The employer's BGV provider performs the checks, collects candidate information and issues the report. HRANITI only keeps the case reference and shows provider status/results.</p></div></div></div><div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><p className="text-xs font-semibold text-[#173454]">HRANITI will show</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{["Provider status","Pending items","Completion date","Provider report / link"].map(x=><div key={x} className="rounded-xl bg-[#F7F9F9] px-3 py-2.5 text-xs text-[#526A7D]">{x}</div>)}</div></div><div className="mt-5 flex justify-end gap-2 border-t border-[#E6ECEF] pt-5"><button onClick={()=>setOpen(false)} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Cancel</button><button onClick={createCheck} disabled={saving} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white">{saving?"Saving…":"Link BGV case"}</button></div>{message&&<p className="mt-3 text-right text-xs text-[#167D73]">{message}</p>}</section>
        </div>:
        <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F3F1] text-[#167D73]"><UserRound size={18}/></span><div><p className="text-sm font-semibold text-[#173454]">{selected.candidate_name}</p><p className="text-[11px] text-[#71859A]">{selected.candidate_email||"Email not provided"}</p></div></div>
            <div className="mt-5 space-y-3"><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Role</p><p className="mt-1 text-xs text-[#526A7D]">{selected.job_title||"—"}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Provider</p><p className="mt-1 text-xs text-[#526A7D]">{selected.provider_name||"External BGV provider"}</p></div><div><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Due</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.due_at)}</p></div></div>
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
<div className="mt-4 space-y-2">{selectedItems.map(i=><div key={i.id} className="rounded-xl border border-[#DDE5EA] bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold text-[#173454]">{i.check_type}</p><p className="mt-1 text-[10px] text-[#71859A]">{i.provider||"Manual verification"}</p></div><select value={i.status} disabled className={"h-9 rounded-lg border border-[#DDE5EA] bg-white px-2 text-[10px] font-medium "+itemTone(i.status)}><option>Pending</option><option>Requested</option><option>In progress</option><option>Clear</option><option>Needs review</option><option>Unable to verify</option><option>Not applicable</option></select></div><textarea value={i.result_summary??""} disabled rows={2} className="mt-3 w-full rounded-lg border border-[#EEF2F4] bg-[#FCFCFA] p-2.5 text-[11px] outline-none" placeholder="Result summary / evidence note…"/></div>)}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Provider case</p><p className="mt-1 text-xs text-[#526A7D]">{selected.provider_case_id||"Not available"}</p></div><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Last provider update</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.last_provider_update_at)}</p></div></div>{selected.report_url&&<div className="mt-3 rounded-xl border border-[#B9DDD7] bg-[#F3FAF8] p-4"><p className="text-xs font-semibold text-[#173454]">Provider report available</p><a href={selected.report_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg bg-[#167D73] px-3 py-2 text-[10px] font-medium text-white">Open provider report</a></div>}<div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Requested</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.requested_at)}</p></div><div className="rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Completed</p><p className="mt-1 text-xs text-[#526A7D]">{date(selected.completed_at)}</p></div></div>
            {selected.overall_note&&<div className="mt-4 rounded-xl border border-[#DDE5EA] bg-white p-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">Internal note</p><p className="mt-1 text-xs leading-5 text-[#526A7D]">{selected.overall_note}</p></div>}
            {message&&<div className="mt-4 rounded-xl border border-[#B9DDD7] bg-[#F3FAF8] px-4 py-3 text-xs text-[#167D73]">{message}</div>}
          </section>
        </div>}
      </div>
    </div>}
  </EmployerShell>;
}
