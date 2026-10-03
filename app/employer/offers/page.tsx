"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, FileText, History, Plus, Search, Send, ShieldCheck, UserRound, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type Candidate = { id: string; user_id: string; job_id: string; status: string | null; pipeline_stage: string | null; next_step: string | null; };
type Job = { id: string; title: string; location: string | null; employment_type: string | null; work_mode: string | null; company_id: string; description: string | null; };
type Profile = { id: string; full_name: string | null; email: string | null; current_location: string | null; notice_period: string | null; expected_salary: number | null; salary_currency: string | null; };
type Version = { id: string; template_id: string; version_number: number; content_html: string; variable_schema: { key: string; label: string }[]; source_file_name: string | null; };
type Template = { id: string; name: string; description: string | null; template_type: string; country_code: string | null; employment_type: string | null; is_default: boolean; status: string; versions?: Version[]; };
type Offer = {
  id: string; application_id: string | null; company_id: string | null; offer_number: string | null;
  candidate_name: string | null; candidate_email: string | null; job_title: string | null;
  work_location: string | null; work_mode: string | null; employment_type: string | null;
  salary_currency: string | null; pay_frequency: string | null; base_salary: number | null;
  bonus_target: number | null; bonus_type: string | null; equity: string | null;
  reporting_to: string | null; probation_period: string | null; notice_period: string | null;
  start_date: string | null; offer_expiry_date: string | null; approval_required: boolean | null;
  approval_note: string | null; approved_at: string | null; sent_at: string | null;
  viewed_at: string | null; responded_at: string | null; candidate_response: string | null;
  response_note: string | null; candidate_message: string | null; internal_notes: string | null;
  letter_body: string | null; letter_html: string | null; version: number | null;
  status: string | null; created_at: string; updated_at: string | null;
  template_id: string | null; template_version_id: string | null; template_source: string | null;
};

const fallbackTemplate =
  "<p>Dear {{candidate_name}},</p>" +
  "<p>We are pleased to offer you the position of <strong>{{job_title}}</strong> at {{company_name}}.</p>" +
  "<p>Your annual base salary will be <strong>{{base_salary}} {{currency}}</strong>, paid {{pay_frequency}}.</p>" +
  "<p>Your proposed joining date is <strong>{{start_date}}</strong>.</p>" +
  "<p>You will report to {{reporting_manager}}.</p>" +
  "<p>We look forward to welcoming you.</p>" +
  "<p>Sincerely,<br/>{{company_name}}</p>";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] ?? c));
}
function safeHtml(html: string) {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,form,style,link,meta").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => [...el.attributes].forEach((a) => {
    if (a.name.toLowerCase().startsWith("on") || a.name.toLowerCase() === "srcdoc") el.removeAttribute(a.name);
    if ((a.name === "href" || a.name === "src") && /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
  }));
  return doc.body.innerHTML;
}
function latest(t: Template) { return (t.versions ?? []).slice().sort((a,b) => b.version_number - a.version_number)[0] ?? null; }
function renderLetter(html: string, values: Record<string,string>) {
  let out = html;
  Object.entries(values).forEach(([key, value]) => {
    out = out.split("{{" + key + "}}").join(esc(value || "—"));
  });
  return safeHtml(out);
}
function stripHtml(html: string) {
  if (typeof window === "undefined") return html.replace(/<[^>]*>/g, " ");
  const div = document.createElement("div"); div.innerHTML = html; return div.textContent ?? "";
}
function money(value: number | null, currency: string | null) {
  if (value == null) return "—";
  try { return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value) + " " + (currency || ""); }
  catch { return String(value) + " " + (currency || ""); }
}
function statusTone(status: string | null) {
  if (status === "Accepted") return "bg-[#E7F3F1] text-[#167D73]";
  if (status === "Pending approval") return "bg-[#FFF7E6] text-[#8A641E]";
  if (status === "Approved") return "bg-[#EDF5FF] text-[#3D6F9E]";
  if (status === "Declined" || status === "Withdrawn") return "bg-[#FFF1EE] text-[#B34E3E]";
  if (status === "Sent") return "bg-[#F0EEFA] text-[#6658A5]";
  return "bg-[#F5F7F7] text-[#71859A]";
}

export default function OffersPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const requestedApplication = searchParams.get("application");
  const editorRef = useRef<HTMLDivElement>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("Your company");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [saving, setSaving] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateVersionId, setTemplateVersionId] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [payFrequency, setPayFrequency] = useState("Annual");
  const [bonusTarget, setBonusTarget] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [reportingTo, setReportingTo] = useState("");
  const [probation, setProbation] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [candidateMessage, setCandidateMessage] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [responseNote, setResponseNote] = useState("");

  async function load() {
    setLoading(true);
    const auth = await supabase.auth.getUser();
    if (!auth.data.user) { setLoading(false); return; }
    const user = auth.data.user;
    const company = await getOrCreateCompanyId(supabase, user);
    setCompanyId(company);
    const companyResult = await supabase.from("companies").select("name").eq("id", company).single();
    setCompanyName(companyResult.data?.name ?? "Your company");
    const [offersResult, jobsResult, templatesResult, memberResult] = await Promise.all([
      supabase.from("offers").select("*").eq("company_id", company).order("created_at", { ascending: false }),
      supabase.from("jobs").select("id,title,location,employment_type,work_mode,company_id,description").eq("company_id", company).order("created_at", { ascending: false }),
      supabase.from("offer_templates").select("id,name,description,template_type,country_code,employment_type,is_default,status,offer_template_versions(id,template_id,version_number,content_html,variable_schema,source_file_name)").eq("company_id", company).eq("status", "Active").order("is_default", { ascending: false }),
      supabase.from("company_team_members").select("role").eq("company_id", company).eq("user_id", user.id).eq("status", "Active").limit(1)
    ]);
    if (offersResult.error) setMessage(offersResult.error.message);
    setOffers((offersResult.data ?? []) as Offer[]);
    setJobs((jobsResult.data ?? []) as Job[]);
    setTemplates((templatesResult.data ?? []) as unknown as Template[]);
    setUserRole(memberResult.data?.[0]?.role ?? "");
    const jobIds = (jobsResult.data ?? []).map((j) => j.id);
    if (jobIds.length) {
      const appsResult = await supabase.from("applications").select("id,user_id,job_id,status,pipeline_stage,next_step").in("job_id", jobIds).order("applied_at", { ascending: false });
      const apps = (appsResult.data ?? []) as Candidate[];
      setApplications(apps);
      const userIds = [...new Set(apps.map((a) => a.user_id))];
      if (userIds.length) {
        const p = await supabase.from("profiles").select("id,full_name,email,current_location,notice_period,expected_salary,salary_currency").in("id", userIds);
        setProfiles((p.data ?? []) as Profile[]);
      }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applicationRows = useMemo(() => applications.map((a) => ({
    app: a, job: jobs.find((j) => j.id === a.job_id), profile: profiles.find((p) => p.id === a.user_id)
  })).filter((x) => x.job && x.profile), [applications, jobs, profiles]);

  const visibleOffers = offers.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (o.candidate_name ?? "").toLowerCase().includes(q) || (o.job_title ?? "").toLowerCase().includes(q) || (o.offer_number ?? "").toLowerCase().includes(q);
    return matchesSearch && (filter === "All" || o.status === filter);
  });

  const counts = ["Draft","Pending approval","Approved","Sent","Accepted"].map((s) => [s, offers.filter((o) => o.status === s).length] as const);

  function renderCurrentLetter(row?: { app: Candidate; job?: Job; profile?: Profile }, template?: Template, version?: Version | null) {
    const r = row ?? applicationRows.find((x) => x.app.id === candidateId);
    const html = version?.content_html ?? latest(template ?? ({ versions: [] } as Template))?.content_html ?? fallbackTemplate;
    const values: Record<string,string> = {
      candidate_name: r?.profile?.full_name ?? selectedOffer?.candidate_name ?? "",
      candidate_email: r?.profile?.email ?? selectedOffer?.candidate_email ?? "",
      job_title: r?.job?.title ?? selectedOffer?.job_title ?? "",
      company_name: companyName,
      work_location: workLocation,
      work_mode: workMode,
      employment_type: employmentType,
      base_salary: baseSalary ? money(Number(baseSalary), currency) : "",
      currency,
      pay_frequency: payFrequency,
      bonus_target: bonusTarget ? money(Number(bonusTarget), currency) : "",
      start_date: startDate,
      offer_expiry_date: expiryDate,
      reporting_manager: reportingTo,
      probation_period: probation,
      notice_period: noticePeriod
    };
    return renderLetter(html, values);
  }

  function openNew(applicationId?: string) {
    const row = applicationRows.find((x) => x.app.id === (applicationId ?? requestedApplication)) ?? applicationRows[0];
    const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
    const version = defaultTemplate ? latest(defaultTemplate) : null;
    setSelectedOffer(null); setCandidateId(row?.app.id ?? ""); setTemplateId(defaultTemplate?.id ?? ""); setTemplateVersionId(version?.id ?? "");
    setBaseSalary(row?.profile?.expected_salary ? String(row.profile.expected_salary) : ""); setCurrency(row?.profile?.salary_currency ?? "INR");
    setPayFrequency("Annual"); setBonusTarget(""); setWorkLocation(row?.job?.location ?? row?.profile?.current_location ?? "");
    setWorkMode(row?.job?.work_mode ?? ""); setEmploymentType(row?.job?.employment_type ?? "Full-time"); setStartDate(""); setExpiryDate("");
    setReportingTo(""); setProbation(""); setNoticePeriod(row?.profile?.notice_period ?? ""); setCandidateMessage(""); setInternalNotes("");
    setApprovalRequired(true); setResponseNote(""); setMessage(""); setOpen(true);
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = renderCurrentLetter(row, defaultTemplate, version); }, 0);
  }

  function openExisting(offer: Offer) {
    const app = applicationRows.find((x) => x.app.id === offer.application_id);
    const template = templates.find((t) => t.id === offer.template_id);
    const version = template?.versions?.find((v) => v.id === offer.template_version_id) ?? latest(template ?? ({ versions: [] } as Template));
    setSelectedOffer(offer); setCandidateId(offer.application_id ?? ""); setTemplateId(offer.template_id ?? ""); setTemplateVersionId(offer.template_version_id ?? version?.id ?? "");
    setBaseSalary(offer.base_salary == null ? "" : String(offer.base_salary)); setCurrency(offer.salary_currency ?? "INR"); setPayFrequency(offer.pay_frequency ?? "Annual");
    setBonusTarget(offer.bonus_target == null ? "" : String(offer.bonus_target)); setWorkLocation(offer.work_location ?? app?.job?.location ?? "");
    setWorkMode(offer.work_mode ?? app?.job?.work_mode ?? ""); setEmploymentType(offer.employment_type ?? app?.job?.employment_type ?? "Full-time");
    setStartDate(offer.start_date ?? ""); setExpiryDate(offer.offer_expiry_date ?? ""); setReportingTo(offer.reporting_to ?? "");
    setProbation(offer.probation_period ?? ""); setNoticePeriod(offer.notice_period ?? app?.profile?.notice_period ?? "");
    setCandidateMessage(offer.candidate_message ?? ""); setInternalNotes(offer.internal_notes ?? ""); setApprovalRequired(offer.approval_required !== false);
    setResponseNote(offer.response_note ?? ""); setMessage(""); setOpen(true);
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = offer.letter_html ?? renderCurrentLetter(app, template, version); }, 0);
  }

  function templateChanged(id: string) {
    const t = templates.find((x) => x.id === id); const v = latest(t ?? ({ versions: [] } as Template));
    setTemplateId(id); setTemplateVersionId(v?.id ?? "");
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = renderCurrentLetter(undefined, t, v); }, 0);
  }

  async function saveOffer(nextStatus: string) {
    const row = applicationRows.find((x) => x.app.id === candidateId);
    if (!row?.profile || !row.job) { setMessage("Choose an applicant before saving the offer."); return; }
    if (!startDate) { setMessage("Add the proposed start date before saving the offer."); return; }
    const template = templates.find((t) => t.id === templateId);
    const version = template?.versions?.find((v) => v.id === templateVersionId) ?? latest(template ?? ({ versions: [] } as Template));
    const finalHtml = safeHtml(editorRef.current?.innerHTML ?? renderCurrentLetter(row, template, version));
    setSaving(true); setMessage("");
    const auth = await supabase.auth.getUser(); if (!auth.data.user) { setSaving(false); return; }
    const user = auth.data.user;
    const payload = {
      application_id: row.app.id, company_id: companyId, created_by: user.id, updated_by: user.id,
      candidate_name: row.profile.full_name, candidate_email: row.profile.email, job_title: row.job.title,
      work_location: workLocation, work_mode: workMode, employment_type: employmentType,
      salary_currency: currency, pay_frequency: payFrequency, base_salary: baseSalary ? Number(baseSalary) : null,
      bonus_target: bonusTarget ? Number(bonusTarget) : null, bonus_type: "Target", reporting_to: reportingTo || null,
      probation_period: probation || null, notice_period: noticePeriod || null, offer_expiry_date: expiryDate || null, start_date: startDate,
      approval_required: approvalRequired, candidate_message: candidateMessage || null, internal_notes: internalNotes || null,
      letter_body: stripHtml(finalHtml).trim(), letter_html: finalHtml, template_id: template?.id ?? null, template_version_id: version?.id ?? null,
      template_source: template?.template_type ?? "hraniti",
      template_snapshot: { template_name: template?.name ?? "HRaniti standard", version: version?.version_number ?? 1, fields: { candidate_name: row.profile.full_name, job_title: row.job.title, base_salary: baseSalary, currency, start_date: startDate } },
      version: selectedOffer?.version ?? 1, status: nextStatus, updated_at: new Date().toISOString()
    };
    const result = selectedOffer
      ? await supabase.from("offers").update(payload).eq("id", selectedOffer.id).select("*").single()
      : await supabase.from("offers").insert(payload).select("*").single();
    if (result.error || !result.data) { setMessage(result.error?.message ?? "Could not save offer."); setSaving(false); return; }
    await supabase.from("offer_events").insert({ offer_id: result.data.id, company_id: companyId, event_type: nextStatus === "Pending approval" ? "submitted_for_approval" : "draft_saved", actor_id: user.id, metadata: { template_id: template?.id, template_version_id: version?.id } });
    setSelectedOffer(result.data as Offer); setSaving(false); await load();
    if (nextStatus !== "Draft") setMessage(nextStatus === "Pending approval" ? "Offer saved and submitted for internal approval." : "Offer updated.");
  }

  async function approve(offer: Offer) {
    if (!["Owner","Admin","Recruiter"].includes(userRole)) { setMessage("Only an Owner, Admin or Recruiter can approve an offer."); return; }
    const auth = await supabase.auth.getUser(); if (!auth.data.user) return;
    const result = await supabase.from("offers").update({ status: "Approved", approved_by: auth.data.user.id, approved_at: new Date().toISOString(), updated_by: auth.data.user.id }).eq("id", offer.id).select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("offer_events").insert({ offer_id: offer.id, company_id: companyId, event_type: "approved", actor_id: auth.data.user.id, metadata: {} });
    await load(); setOpen(false);
  }

  async function recordSent(offer: Offer) {
    if (offer.status !== "Approved") { setMessage("Approve the offer before recording delivery."); return; }
    const auth = await supabase.auth.getUser(); if (!auth.data.user) return;
    const result = await supabase.from("offers").update({ status: "Sent", sent_at: new Date().toISOString(), updated_by: auth.data.user.id }).eq("id", offer.id).select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("offer_events").insert({ offer_id: offer.id, company_id: companyId, event_type: "delivery_recorded", actor_id: auth.data.user.id, metadata: { note: "Recorded by recruiter; no email was sent by HRaniti." } });
    await load();
  }

  async function respond(offer: Offer, response: "Accepted" | "Changes requested" | "Declined") {
    const auth = await supabase.auth.getUser(); if (!auth.data.user) return;
    const nextStatus = response === "Accepted" ? "Accepted" : response === "Declined" ? "Declined" : "Draft";
    const result = await supabase.from("offers").update({
      status: nextStatus, candidate_response: response, response_note: responseNote || null, responded_at: new Date().toISOString(), updated_by: auth.data.user.id,
      ...(response === "Changes requested" ? { version: (offer.version ?? 1) + 1 } : {})
    }).eq("id", offer.id).select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    await supabase.from("offer_events").insert({ offer_id: offer.id, company_id: companyId, event_type: response.toLowerCase().replaceAll(" ", "_"), actor_id: auth.data.user.id, metadata: { response_note: responseNote } });
    if (response === "Accepted" && offer.application_id) await supabase.from("applications").update({ pipeline_stage: "Offer", next_step: "Complete pre-employment checks" }).eq("id", offer.application_id);
    if (response === "Declined" && offer.application_id) await supabase.from("applications").update({ status: "declined", next_step: "Closed" }).eq("id", offer.application_id);
    setResponseNote(""); await load(); setOpen(false);
  }

  async function withdraw(offer: Offer) {
    const auth = await supabase.auth.getUser(); if (!auth.data.user) return;
    const result = await supabase.from("offers").update({ status: "Withdrawn", withdrawn_at: new Date().toISOString(), updated_by: auth.data.user.id }).eq("id", offer.id).select("*").single();
    if (result.error) setMessage(result.error.message);
    else { await supabase.from("offer_events").insert({ offer_id: offer.id, company_id: companyId, event_type: "withdrawn", actor_id: auth.data.user.id, metadata: {} }); await load(); setOpen(false); }
  }

  const currentRow = applicationRows.find((x) => x.app.id === candidateId);
  const selectedTemplate = templates.find((t) => t.id === templateId);
  const selectedVersion = selectedTemplate?.versions?.find((v) => v.id === templateVersionId) ?? latest(selectedTemplate ?? ({ versions: [] } as Template));

  return <EmployerShell>
    <div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167D73]">HIRING</p><h1 className="mt-2 font-display text-3xl text-[#173454]">Offers</h1><p className="mt-1 max-w-2xl text-sm text-[#71859A]">Prepare, approve and track offers without losing the candidate context.</p></div>
          <button onClick={() => openNew()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white"><Plus size={15}/> New offer</button>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-5">{counts.map(([label,count]) => <button key={label} onClick={() => setFilter(label)} className={"rounded-2xl border bg-white p-4 text-left " + (filter === label ? "border-[#A9D4CE]" : "border-[#DDE5EA]")}><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#173454]">{count}</p></button>)}</div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-3 text-[#9AA8B3]"/><input value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-xl border border-[#DDE5EA] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#A9D4CE]" placeholder="Search candidate, role or offer number"/></div><select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs text-[#526A7D] outline-none"><option>All</option><option>Draft</option><option>Pending approval</option><option>Approved</option><option>Sent</option><option>Accepted</option><option>Declined</option><option>Withdrawn</option></select></div>
        {message && <div className="mt-4 rounded-xl border border-[#B9DDD7] bg-[#F3FAF8] px-4 py-3 text-xs text-[#167D73]">{message}</div>}
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white">
          {loading ? <div className="p-8 text-center text-sm text-[#71859A]">Loading offers…</div> :
           visibleOffers.length === 0 ? <div className="p-10 text-center"><FileText className="mx-auto text-[#9AA8B3]" size={25}/><p className="mt-3 text-sm font-medium text-[#173454]">No offers here yet</p><p className="mt-1 text-xs text-[#71859A]">Start from an applicant after the hiring manager review stage.</p><button onClick={() => openNew()} className="mt-5 rounded-xl border border-[#B9DDD7] px-4 py-2.5 text-xs font-medium text-[#167D73]">Create first offer</button></div> :
           <div className="divide-y divide-[#EEF2F4]">{visibleOffers.map((offer) => <button key={offer.id} onClick={() => openExisting(offer)} className="flex w-full flex-col gap-3 p-5 text-left hover:bg-[#FCFCFA] sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold text-[#173454]">{offer.candidate_name || "Candidate"}</p><span className={"rounded-full px-2 py-1 text-[10px] font-medium " + statusTone(offer.status)}>{offer.status || "Draft"}</span></div><p className="mt-1 text-xs text-[#526A7D]">{offer.job_title || "Role"} · {offer.work_location || "Location not set"}</p><p className="mt-1 text-[11px] text-[#9AA8B3]">{offer.offer_number || "Offer draft"} · v{offer.version || 1} · {money(offer.base_salary, offer.salary_currency)}</p></div><div className="flex items-center gap-2 text-[11px] text-[#71859A]"><span>{offer.start_date || "Start date not set"}</span><ChevronDown size={14} className="-rotate-90"/></div></button>)}</div>}
        </div>
        <div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white p-5"><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[#167D73]"/><div><p className="text-xs font-semibold text-[#173454]">Connected hiring flow</p><p className="mt-1 text-[11px] leading-5 text-[#71859A]">Applicant → Offer → approval → candidate response → pre-employment checks → Hired. An accepted offer never marks a candidate hired automatically.</p></div></div></div>
      </div>

      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-[#173454]/20 p-4 sm:p-7">
        <div className="mx-auto max-w-[1240px] rounded-2xl bg-white shadow-[0_24px_80px_rgba(23,52,84,0.2)]">
          <div className="flex items-center justify-between border-b border-[#E6ECEF] px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#167D73]">{selectedOffer ? "OFFER" : "NEW OFFER"}</p><h2 className="mt-1 text-lg font-semibold text-[#173454]">{selectedOffer?.candidate_name || currentRow?.profile?.full_name || "Create offer"}</h2></div><button onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#71859A] hover:bg-[#F5F7F7]"><X size={18}/></button></div>
          <div className="grid lg:grid-cols-[430px_minmax(0,1fr)]">
            <aside className="border-b border-[#E6ECEF] p-5 lg:border-b-0 lg:border-r sm:p-7">
              <label className="block text-xs font-medium text-[#526A7D]">Applicant</label>
              <select value={candidateId} disabled={!!selectedOffer} onChange={(e) => { setCandidateId(e.target.value); const row = applicationRows.find((x) => x.app.id === e.target.value); if (row) { setWorkLocation(row.job?.location ?? row.profile?.current_location ?? ""); setEmploymentType(row.job?.employment_type ?? "Full-time"); setNoticePeriod(row.profile?.notice_period ?? ""); setBaseSalary(row.profile?.expected_salary ? String(row.profile.expected_salary) : ""); setCurrency(row.profile?.salary_currency ?? "INR"); } }} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs outline-none"><option value="">Select applicant</option>{applicationRows.map((x) => <option key={x.app.id} value={x.app.id}>{x.profile?.full_name || "Candidate"} · {x.job?.title || "Role"}</option>)}</select>
              {currentRow?.profile && <div className="mt-3 rounded-xl bg-[#F7F9F9] p-4"><p className="text-sm font-medium text-[#173454]">{currentRow.profile.full_name}</p><p className="mt-1 text-xs text-[#71859A]">{currentRow.profile.email}</p><p className="mt-1 text-xs text-[#71859A]">{currentRow.job?.title} · {currentRow.job?.location}</p><Link href={"/employer/applicants/" + currentRow.app.id} className="mt-3 inline-flex text-xs text-[#167D73]">Open applicant →</Link></div>}
              <label className="mt-5 block text-xs font-medium text-[#526A7D]">Offer template</label>
              <select value={templateId} onChange={(e) => templateChanged(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs outline-none"><option value="">HRaniti standard</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? " · Default" : ""}</option>)}</select>
              <div className="mt-2 text-[11px] text-[#71859A]">{selectedVersion ? "Version " + selectedVersion.version_number + (selectedVersion.source_file_name ? " · " + selectedVersion.source_file_name : "") : "No company template selected"}</div><Link href="/employer/settings/hiring/templates" className="mt-2 inline-flex text-[11px] text-[#167D73]">Manage templates →</Link>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-[#526A7D]">Base salary</label><input value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} type="number" className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs outline-none" placeholder="2400000"/></div>
                <div><label className="block text-xs font-medium text-[#526A7D]">Currency</label><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-2 text-xs"><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option><option>SGD</option></select></div>
                <div><label className="block text-xs font-medium text-[#526A7D]">Pay frequency</label><select value={payFrequency} onChange={(e) => setPayFrequency(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] bg-white px-2 text-xs"><option>Annual</option><option>Monthly</option><option>Hourly</option></select></div>
                <div><label className="block text-xs font-medium text-[#526A7D]">Bonus target</label><input value={bonusTarget} onChange={(e) => setBonusTarget(e.target.value)} type="number" className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs outline-none" placeholder="10"/></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3"><div><label className="block text-xs font-medium text-[#526A7D]">Start date</label><input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs"/></div><div><label className="block text-xs font-medium text-[#526A7D]">Offer expiry</label><input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} type="date" className="mt-2 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs"/></div></div>
              <div className="mt-3 grid grid-cols-2 gap-3"><input value={workLocation} onChange={(e) => setWorkLocation(e.target.value)} className="h-10 rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Work location"/><input value={reportingTo} onChange={(e) => setReportingTo(e.target.value)} className="h-10 rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Reporting manager"/><input value={probation} onChange={(e) => setProbation(e.target.value)} className="h-10 rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Probation"/><input value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} className="h-10 rounded-xl border border-[#DDE5EA] px-3 text-xs" placeholder="Notice period"/></div>
              <label className="mt-4 flex items-center gap-2 text-xs text-[#526A7D]"><input type="checkbox" checked={approvalRequired} onChange={(e) => setApprovalRequired(e.target.checked)} className="accent-[#167D73]"/> Require internal approval</label>
              <label className="mt-4 block text-xs font-medium text-[#526A7D]">Candidate message</label><textarea value={candidateMessage} onChange={(e) => setCandidateMessage(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs outline-none" placeholder="A short message to accompany the offer…"/>
              <label className="mt-4 block text-xs font-medium text-[#526A7D]">Internal notes</label><textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-[#DDE5EA] p-3 text-xs outline-none" placeholder="Private hiring context…"/>
            </aside>
            <section className="p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-[#173454]">Offer letter preview</p><p className="mt-1 text-[11px] text-[#71859A]">Candidate-specific edits stay on this offer. The company template remains unchanged.</p></div>{selectedOffer && <span className={"self-start rounded-full px-2.5 py-1 text-[10px] font-medium " + statusTone(selectedOffer.status)}>{selectedOffer.status}</span>}</div>
              <div className="mt-4 overflow-hidden rounded-xl border border-[#DDE5EA]"><div className="border-b border-[#E6ECEF] bg-[#FAFBFB] px-3 py-2 text-[10px] text-[#9AA8B3]">Editable offer · template version {selectedVersion?.version_number ?? 1}</div><div ref={editorRef} contentEditable suppressContentEditableWarning className="min-h-[500px] bg-white p-8 text-sm leading-7 text-[#2F4658] outline-none prose prose-sm max-w-none"/></div>
              {selectedOffer && <div className="mt-4 rounded-xl border border-[#DDE5EA] bg-[#FCFCFA] p-4"><div className="flex items-center gap-2"><History size={14} className="text-[#167D73]"/><p className="text-xs font-semibold text-[#173454]">Offer history</p></div><p className="mt-1 text-[11px] text-[#71859A]">Version {selectedOffer.version || 1} · {selectedOffer.candidate_response || "No candidate response recorded"}</p></div>}
              {selectedOffer?.status === "Sent" && <div className="mt-4 rounded-xl border border-[#E5DDF4] bg-[#FAF8FE] p-4"><p className="text-xs font-semibold text-[#6658A5]">Candidate response</p><p className="mt-1 text-[11px] text-[#71859A]">Record the response after the candidate replies through your connected channel.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => respond(selectedOffer, "Accepted")} className="rounded-xl bg-[#167D73] px-3 py-2 text-[11px] font-medium text-white">Accepted</button><button onClick={() => respond(selectedOffer, "Changes requested")} className="rounded-xl border border-[#DDE5EA] px-3 py-2 text-[11px] text-[#526A7D]">Changes requested</button><button onClick={() => respond(selectedOffer, "Declined")} className="rounded-xl border border-[#F0D5CF] px-3 py-2 text-[11px] text-[#B34E3E]">Declined</button></div><input value={responseNote} onChange={(e) => setResponseNote(e.target.value)} className="mt-3 h-10 w-full rounded-xl border border-[#DDE5EA] px-3 text-xs outline-none" placeholder="Optional response note"/></div>}
              <div className="mt-5 flex flex-col gap-3 border-t border-[#E6ECEF] pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="text-[11px] text-[#9AA8B3]">{selectedOffer?.status === "Approved" ? "Approved · ready to record candidate delivery" : selectedOffer?.status === "Accepted" ? "Accepted · continue with pre-employment checks" : "Draft changes are saved only when you choose an action."}</div><div className="flex flex-wrap justify-end gap-2">
                {selectedOffer && <button onClick={() => withdraw(selectedOffer)} className="rounded-xl border border-[#F0D5CF] px-3 py-2.5 text-xs text-[#B34E3E]">Withdraw</button>}
                <button onClick={() => saveOffer("Draft")} disabled={saving} className="rounded-xl border border-[#DDE5EA] px-3 py-2.5 text-xs font-medium text-[#526A7D]">{saving ? "Saving…" : "Save draft"}</button>
                {(!selectedOffer || selectedOffer.status === "Draft") && <button onClick={() => saveOffer(approvalRequired ? "Pending approval" : "Approved")} disabled={saving} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white">{approvalRequired ? "Submit for approval" : "Approve offer"}</button>}
                {selectedOffer?.status === "Pending approval" && <button onClick={() => approve(selectedOffer)} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white"><Check size={14} className="mr-1 inline"/> Approve</button>}
                {selectedOffer?.status === "Approved" && <button onClick={() => recordSent(selectedOffer)} className="rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white"><Send size={14} className="mr-1 inline"/> Record delivered</button>}
                {selectedOffer?.status === "Accepted" && selectedOffer.application_id && <Link href={"/employer/applicants/" + selectedOffer.application_id} className="rounded-xl border border-[#B9DDD7] bg-[#E7F3F1] px-4 py-2.5 text-xs font-medium text-[#167D73]"><UserRound size={14} className="mr-1 inline"/> Continue checks</Link>}
              </div></div>
              {selectedOffer?.status === "Approved" && <p className="mt-3 text-right text-[10px] text-[#9AA8B3]">“Record delivered” updates the hiring record only; it does not send email.</p>}
            </section>
          </div>
        </div>
      </div>}
    </div>
  </EmployerShell>;
}
