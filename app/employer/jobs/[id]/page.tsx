"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Edit3, MapPin, MoreHorizontal, Pause, Play, UsersRound, XCircle } from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type Job = Record<string, any>;

function statusLabel(status: string) {
  if (status === "active" || status === "open" || status === "Open") return "Open";
  if (status === "paused" || status === "Paused") return "Paused";
  if (status === "closed" || status === "Closed") return "Closed";
  return "Draft";
}

function parseDescription(raw: string) {
  try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === "object") return parsed; } catch {}
  return { description: raw, responsibilities: "" };
}

export default function EmployerJobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const companyId = await getOrCreateCompanyId(supabase, user);
    const { data } = await supabase.from("jobs").select("*").eq("id", params.id).eq("company_id", companyId).single();
    if (data) {
      setJob(data);
      const { count } = await supabase.from("applications").select("id", { count: "exact", head: true }).eq("job_id", data.id);
      setApplications(count ?? data.applicant_count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const details = useMemo(() => parseDescription(job?.description ?? ""), [job?.description]);
  const status = statusLabel(job?.status ?? "draft");

  async function changeStatus(next: "active" | "paused" | "closed") {
    if (!job) return;
    setWorking(true);
    setMenuOpen(false);
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", job.id);
    if (!error) setJob({ ...job, status: next });
    setWorking(false);
  }

  if (loading) return <EmployerShell><div className="px-6 py-16 text-center text-sm text-[#71859A]">Loading job…</div></EmployerShell>;
  if (!job) return <EmployerShell><div className="px-6 py-16 text-center"><p className="text-sm text-[#71859A]">This job could not be found.</p><Link href="/employer/jobs" className="mt-3 inline-block text-sm text-[#167D73]">Back to Jobs</Link></div></EmployerShell>;

  return (
    <EmployerShell>
      <div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
        <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-10">
          <Link href="/employer/jobs" className="inline-flex items-center gap-2 text-[13px] text-[#71859A] hover:text-[#173454]"><ArrowLeft size={15}/> Back to Jobs</Link>

          <div className="mt-6 rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(23,52,84,0.025)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#E7F3F1] px-2.5 py-1 text-[10px] font-medium text-[#167D73]">{status}</span>
                  {job.employment_type && <span className="text-[11px] text-[#8A99A5]">{job.employment_type}</span>}
                </div>
                <h1 className="mt-3 font-display text-3xl text-[#173454]">{job.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[#71859A]">
                  <span className="flex items-center gap-1.5"><MapPin size={14}/>{job.location}</span>
                  {job.work_mode && <span>{job.work_mode}</span>}
                  {job.career_track && <span>{job.career_track}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/employer/jobs/${job.id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-4 py-2.5 text-sm font-medium text-[#526A7D] hover:border-[#B9DDD7] hover:text-[#167D73]"><Edit3 size={15}/> Edit</Link>
                <div className="relative">
                  <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-xl border border-[#DDE5EA] p-2.5 text-[#71859A] hover:bg-[#F5F8F8]" aria-label="More job actions"><MoreHorizontal size={18}/></button>
                  {menuOpen && <div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-[#DDE5EA] bg-white p-1.5 shadow-[0_14px_35px_rgba(23,52,84,0.14)]">{status === "Open" && <button onClick={() => changeStatus("paused")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#526A7D] hover:bg-[#F5F8F8]"><Pause size={14}/> Pause job</button>}{status === "Paused" && <button onClick={() => changeStatus("active")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#526A7D] hover:bg-[#F5F8F8]"><Play size={14}/> Resume job</button>}{status !== "Closed" && <button onClick={() => changeStatus("closed")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#B34E3E] hover:bg-[#FDF5F3]"><XCircle size={14}/> Close job</button>}</div>}
                </div>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#E7ECEF] bg-[#E7ECEF] sm:grid-cols-4">
              {[["Applications", applications],["Openings", details.requirements?.openings ?? "1"],["Experience", job.min_experience_years ? `${job.min_experience_years}+ years` : "Flexible"],["Created", new Date(job.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})]].map(([label,value]) => <div key={String(label)} className="bg-[#FCFDFD] px-4 py-4"><p className="text-[10px] uppercase tracking-[0.12em] text-[#9AA8B3]">{label}</p><p className="mt-1 text-sm font-medium text-[#173454]">{value}</p></div>)}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-7"><h2 className="text-base font-semibold text-[#173454]">About the role</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#526A7D]">{details.intro || details.description || job.why_join_us || "No role introduction added."}</p></section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-7"><h2 className="text-base font-semibold text-[#173454]">Job description</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#526A7D]">{details.description || "No description added."}</p></section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-7"><h2 className="text-base font-semibold text-[#173454]">Responsibilities</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#526A7D]">{details.responsibilities || "No responsibilities added."}</p></section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-7"><h2 className="text-base font-semibold text-[#173454]">Requirements</h2><div className="mt-4 flex flex-wrap gap-2">{(job.required_skills ?? []).map((skill:string)=><span key={skill} className="rounded-full bg-[#EAF4F2] px-3 py-1.5 text-[12px] text-[#176E68]">{skill}</span>)}</div>{(job.preferred_skills ?? []).length > 0 && <><p className="mt-5 text-xs font-medium text-[#71859A]">Preferred</p><div className="mt-2 flex flex-wrap gap-2">{job.preferred_skills.map((skill:string)=><span key={skill} className="rounded-full bg-[#F3F6F7] px-3 py-1.5 text-[12px] text-[#526A7D]">{skill}</span>)}</div></>}</section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-7"><h2 className="text-base font-semibold text-[#173454]">Hiring process</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">Recruiter</p><p className="mt-1 text-sm text-[#526A7D]">{details.process?.recruiterName || "Not assigned"}</p></div><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">Hiring manager</p><p className="mt-1 text-sm text-[#526A7D]">{details.process?.hiringManager || "Not assigned"}</p></div><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8A5]">Pipeline</p><p className="mt-1 text-sm text-[#526A7D]">{details.process?.pipeline || "Standard"}</p></div><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">Interview</p><p className="mt-1 text-sm text-[#526A7D]">{details.process?.interviewRounds || "—"} rounds · {details.process?.interviewDuration || "—"} min</p></div></div></section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-7"><h2 className="text-base font-semibold text-[#173454]">Compensation & visibility</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">Salary</p><p className="mt-1 text-sm text-[#526A7D]">{job.salary_min != null && job.salary_max != null ? `${job.salary_currency} ${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()}` : "Not specified"}</p></div><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">Visibility</p><p className="mt-1 text-sm text-[#526A7D]">{details.compensation?.visibility || "Public"}</p></div><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">Deadline</p><p className="mt-1 text-sm text-[#526A7D]">{details.compensation?.deadline || "No deadline"}</p></div><div><p className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">Salary visibility</p><p className="mt-1 text-sm text-[#526A7D]">{details.compensation?.salaryVisibility || "Show salary"}</p></div></div></section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-[#167D73] uppercase">APPLICANTS</p>
                <p className="mt-2 text-2xl font-semibold text-[#173454]">{applications}</p>
                <p className="mt-1 text-xs text-[#71859A]">Applications for this role</p>
                <Link href={`/employer/applicants?job=${job.id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#126E66]"><UsersRound size={15}/> View applicants</Link>
              </section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-[#167D73] uppercase">ROLE DETAILS</p>
                <dl className="mt-4 space-y-3">{[["Department", parseDescription(job.description).requirements?.department || "—"],["Work arrangement",job.work_mode || "—"],["Employment",job.employment_type || "—"],["Salary",job.salary_min != null && job.salary_max != null ? `${job.salary_currency} ${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()}` : "Not specified"],["Deadline",parseDescription(job.description).compensation?.deadline || "Not specified"]].map(([label,value])=><div key={String(label)}><dt className="text-[10px] uppercase tracking-[0.1em] text-[#9AA8B3]">{label}</dt><dd className="mt-1 text-xs text-[#526A7D]">{value}</dd></div>)}</dl>
              </section>
              {working && <p className="text-xs text-[#71859A] text-center">Updating job…</p>}
            </aside>
          </div>
        </div>
      </div>
    </EmployerShell>
  );
}
