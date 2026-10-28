"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {createClient} from "@/lib/supabase/client";
import {RefreshCw,Plus} from "lucide-react";

const statuses=["Ready to Submit","Submitted to Client","Under Client Review","Screening","Interview","On Hold","Rejected","Offered","Joined","Withdrawn","Closed"];
export default function FreelancerSubmissionsPage(){
 const s=createClient();
 const [userId,setUserId]=useState(""); const [workspace,setWorkspace]=useState(""); const [recruiterId,setRecruiterId]=useState("");
 const [rows,setRows]=useState<any[]>([]); const [clients,setClients]=useState<any[]>([]); const [jobs,setJobs]=useState<any[]>([]);
 const [loading,setLoading]=useState(true); const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
 const [form,setForm]=useState({candidate_name:"",candidate_email:"",client_id:"",job_id:"",status:"Ready to Submit",joining_date:"",notes:""});
 async function load(){setLoading(true);setMessage("");try{
  const {data:{user}}=await s.auth.getUser(); if(!user)throw new Error("Please sign in again."); setUserId(user.id);
  const {data:members,error:me}=await s.from("company_team_members").select("company_id,role,status").eq("user_id",user.id).eq("role","Freelance Recruiter"); if(me)throw me;
  const membership=(members||[]).find((m:any)=>!["Suspended","Disabled","Inactive"].includes(m.status||"")); if(!membership)throw new Error("No active freelance recruiter membership was found.");
  setWorkspace(membership.company_id);
  const [rec,sub,cli,jb]=await Promise.all([
   s.from("agency_recruiters").select("id").eq("workspace_company_id",membership.company_id).ilike("email",user.email||"").maybeSingle(),
   s.from("agency_submissions").select("*").eq("workspace_company_id",membership.company_id).order("created_at",{ascending:false}),
   s.from("agency_clients").select("id,name").eq("workspace_company_id",membership.company_id).eq("status","Active").order("name"),
   s.from("jobs").select("id,title").eq("company_id",membership.company_id).order("created_at",{ascending:false})
  ]);
  for(const x of [rec,sub,cli,jb])if(x.error)throw x.error;
  if(!rec.data)throw new Error("Your freelancer login is not linked to a recruiter record. Ask the workspace admin to use the same email on the recruiter profile.");
  setRecruiterId(rec.data.id); setRows(sub.data||[]); setClients(cli.data||[]); setJobs(jb.data||[]);
 }catch(e:any){setMessage(e.message||"Unable to load your submissions.");}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function save(e:any){e.preventDefault();setBusy(true);setMessage("");try{
  if(!userId||!workspace||!recruiterId)throw new Error("Your recruiter profile is not ready.");
  const payload={workspace_company_id:workspace,created_by:userId,recruiter_id:recruiterId,client_id:form.client_id,job_id:form.job_id||null,candidate_id:null,candidate_name:form.candidate_name.trim(),candidate_email:form.candidate_email.trim()||null,status:form.status,joining_date:form.status==="Joined"?(form.joining_date||null):null,submitted_at:form.status==="Submitted to Client"?new Date().toISOString():null,notes:form.notes.trim()||null};
  if(!payload.candidate_name||!payload.client_id)throw new Error("Candidate name and company/client are required.");
  const {error}=await s.from("agency_submissions").insert(payload);if(error)throw error;
  setForm({candidate_name:"",candidate_email:"",client_id:"",job_id:"",status:"Ready to Submit",joining_date:"",notes:""});setOpen(false);setMessage("Your submission was saved.");await load();
 }catch(e:any){setMessage(e.message||"Unable to save submission.");}finally{setBusy(false)}}
 async function changeStatus(row:any,status:string){setMessage("");const {error}=await s.from("agency_submissions").update({status,updated_at:new Date().toISOString(),...(status==="Joined"?{joining_date:row.joining_date||new Date().toISOString().slice(0,10)}:{}),...(status==="Submitted to Client"?{submitted_at:new Date().toISOString()}:{})}).eq("id",row.id).eq("workspace_company_id",workspace).eq("recruiter_id",recruiterId);if(error)setMessage(error.message);else{setMessage("Status updated.");await load()}}
 return <main className="min-h-screen bg-[#FCFCFA] px-5 py-8 text-[#173454] sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#DDE5EA] pb-5"><div><Link href="/freelancer/dashboard" className="text-sm font-semibold text-[#167D73]">HRANITI · Freelancer workspace</Link><h1 className="mt-4 text-3xl font-semibold">My submissions</h1><p className="mt-2 text-sm text-[#71859A]">Track only the candidates assigned to your recruiter profile.</p></div><div className="flex gap-2"><button onClick={load} className="rounded-xl border border-[#DDE5EA] bg-white px-3 py-2.5 text-sm"><RefreshCw size={15} className="inline mr-1"/>Refresh</button><button onClick={()=>setOpen(!open)} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-sm text-white"><Plus size={15} className="inline mr-1"/>New submission</button></div></header>
 {message&&<p role="status" className="mt-4 rounded-xl border border-[#DDE5EA] bg-white p-3 text-sm">{message}</p>}
 {open&&<form onSubmit={save} className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><h2 className="font-semibold">Add a candidate submission</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 <label className="text-xs">Candidate name *<input required value={form.candidate_name} onChange={e=>setForm({...form,candidate_name:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] p-3 text-sm"/></label>
 <label className="text-xs">Candidate email<input type="email" value={form.candidate_email} onChange={e=>setForm({...form,candidate_email:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] p-3 text-sm"/></label>
 <label className="text-xs">Company / client *<select required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] bg-white p-3 text-sm"><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label className="text-xs">Job title<select value={form.job_id} onChange={e=>setForm({...form,job_id:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] bg-white p-3 text-sm"><option value="">Select job (optional)</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></label>
 <label className="text-xs">Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] bg-white p-3 text-sm">{statuses.map(st=><option key={st}>{st}</option>)}</select></label>
 {form.status==="Joined"&&<label className="text-xs">Joining date<input type="date" value={form.joining_date} onChange={e=>setForm({...form,joining_date:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] p-3 text-sm"/></label>}
 </div><label className="mt-4 block text-xs">Notes<textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] p-3 text-sm"/></label><div className="mt-4 flex justify-end"><button disabled={busy} className="rounded-xl bg-[#173454] px-4 py-2.5 text-sm text-white disabled:opacity-60">{busy?"Saving…":"Save submission"}</button></div></form>}
 {loading?<div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-8 text-sm text-[#71859A]">Loading your submissions…</div>:rows.length===0?<div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-10 text-center"><h2 className="font-semibold">No submissions yet</h2><p className="mt-2 text-sm text-[#71859A]">Add your first candidate submission to start tracking progress.</p></div>:<div className="mt-5 space-y-3">{rows.map(r=><article key={r.id} className="rounded-2xl border border-[#DDE5EA] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">{r.candidate_name}</h2><p className="mt-1 text-sm text-[#71859A]">{r.candidate_email||"No email"} · {clients.find(c=>c.id===r.client_id)?.name||"Client"} · {jobs.find(j=>j.id===r.job_id)?.title||"Job not linked"}</p><p className="mt-1 text-xs text-[#8A99A5]">Added {r.created_at?new Date(r.created_at).toLocaleDateString():"—"}{r.joining_date?" · Joining "+r.joining_date:""}</p>{r.notes&&<p className="mt-2 text-sm text-[#607385]">{r.notes}</p>}</div><label className="text-xs text-[#71859A]">Status<select value={r.status} onChange={e=>changeStatus(r,e.target.value)} className="mt-1 block rounded-lg border border-[#DDE5EA] bg-white px-3 py-2 text-sm text-[#173454]">{statuses.map(st=><option key={st}>{st}</option>)}</select></label></div></article>)}</div>}
 <footer className="mt-7 flex gap-4 border-t border-[#DDE5EA] pt-4 text-sm"><Link href="/freelancer/hires" className="text-[#167D73]">My hires</Link><Link href="/freelancer/invoices" className="text-[#167D73]">My invoices</Link></footer></div></main>
}
