"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, MapPin, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";
import { COUNTRIES } from "@/lib/countries";

type JobRow = {
  id: string;
  title: string;
  location: string;
  employment_type: string;
  status: string;
  created_at: string;
  applicant_count?: number | null;
  career_track?: string | null;
  description?: string | null;
};

function displayStatus(status: string) {
  if (status === "active" || status === "open" || status === "Open") return "Open";
  if (status === "paused" || status === "Paused") return "Paused";
  if (status === "closed" || status === "Closed") return "Closed";
  if (status === "pending_approval" || status === "Pending approval") return "Pending approval";
  return "Draft";
}

function statusClass(status: string) {
  const label = displayStatus(status);
  if (label === "Open") return "bg-[#E7F3F1] text-[#167D73]";
  if (label === "Paused") return "bg-[#F6F1E7] text-[#8B6D31]";
  if (label === "Closed") return "bg-[#F1F3F4] text-[#71859A]";
  if (label === "Pending approval") return "bg-[#F6F1E7] text-[#8B6D31]";
  return "bg-[#EEF1F4] text-[#607385]";
}

export default function EmployerJobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [menuId, setMenuId] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const companyId = await getOrCreateCompanyId(supabase, user);
    const { data } = await supabase.from("jobs").select("id,title,location,employment_type,status,created_at,applicant_count,career_track,description").eq("company_id", companyId).order("created_at", { ascending: false });
    const rows = (data ?? []) as JobRow[];
    setJobs(rows);

    const counts: Record<string, number> = {};
    if (rows.length) {
      const { data: applications } = await supabase.from("applications").select("job_id").in("job_id", rows.map((job) => job.id));
      for (const row of applications ?? []) counts[row.job_id] = (counts[row.job_id] ?? 0) + 1;
    }
    setApplicationCounts(counts);
    setLoading(false);
  }

  useEffect(() => { loadJobs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function jobCountry(job: JobRow) {
    try {
      const parsed = JSON.parse(job.description ?? "");
      return parsed?.requirements?.country ?? "";
    } catch {}
    const parts = (job.location ?? "").split(",").map((part) => part.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 1] : "";
  }

  const types = ["Full-time", "Contract", "Freelance"];
  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || job.title.toLowerCase().includes(q) || job.location.toLowerCase().includes(q) || (job.career_track ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || displayStatus(job.status) === statusFilter;
    const matchesCountry = countryFilter === "All" || jobCountry(job) === countryFilter;
    const matchesType = typeFilter === "All" || job.employment_type === typeFilter;
    return matchesQuery && matchesStatus && matchesCountry && matchesType;
  }), [jobs, query, statusFilter, countryFilter, typeFilter]);

  async function changeStatus(job: JobRow, next: "active" | "paused" | "closed") {
    setMenuId(null);
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", job.id);
    if (!error) setJobs((current) => current.map((item) => item.id === job.id ? { ...item, status: next } : item));
  }

  async function duplicate(job: JobRow) {
    setMenuId(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const companyId = await getOrCreateCompanyId(supabase, user);
    const { data: source } = await supabase.from("jobs").select("*").eq("id", job.id).single();
    if (!source) return;
    const { id, created_at, public_slug, views, unique_clicks, applicant_count, status, ...copy } = source as any;
    const { error } = await supabase.from("jobs").insert({ ...copy, company_id: companyId, posted_by: user.id, title: `${source.title} — Copy`, status: "draft", applicant_count: 0, views: 0, unique_clicks: 0, public_slug: `${source.public_slug ?? "job"}-copy-${Math.random().toString(36).slice(2,6)}` });
    if (!error) await loadJobs();
  }

  async function deleteJob(job: JobRow) {
    setMenuId(null);

    const confirmed = window.confirm(
      `Delete "${job.title}"? This permanently removes the job from your workspace. This action cannot be undone.`
    );
    if (!confirmed) return;

    const { count, error: countError } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("job_id", job.id);

    if (countError) {
      window.alert("We couldn't verify whether this job has applications. Please try again.");
      return;
    }

    if ((count ?? 0) > 0) {
      window.alert("This job has applications and cannot be deleted. Close the job instead so the candidate history is preserved.");
      return;
    }

    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
    if (error) {
      window.alert("This job could not be deleted. If it has related hiring records, close it instead.");
      return;
    }

    setJobs((current) => current.filter((item) => item.id !== job.id));
    setApplicationCounts((current) => {
      const next = { ...current };
      delete next[job.id];
      return next;
    });
  }

  const counts = {
    All: jobs.length,
    Open: jobs.filter((j) => displayStatus(j.status) === "Open").length,
    "Pending approval": jobs.filter((j) => displayStatus(j.status) === "Pending approval").length,
    Draft: jobs.filter((j) => displayStatus(j.status) === "Draft").length,
    Paused: jobs.filter((j) => displayStatus(j.status) === "Paused").length,
    Closed: jobs.filter((j) => displayStatus(j.status) === "Closed").length,
  };

  return (
    <EmployerShell jobCount={jobs.length}>
      <div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
        <div className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73] uppercase">HIRING</p>
              <h1 className="mt-2 font-display text-3xl sm:text-[34px] text-[#173454]">Jobs</h1>
              <p className="mt-2 text-sm text-[#71859A]">Manage your roles and keep every opening easy to understand.</p>
            </div>
            <Link href="/employer/jobs/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#167D73] px-5 py-3 text-sm font-medium text-white shadow-[0_5px_14px_rgba(22,125,115,0.15)] hover:bg-[#126E66]"><Plus size={17} /> Post a job</Link>
          </div>

          <div className="mt-8 flex gap-1 border-b border-[#DDE5EA] overflow-x-auto">
            {Object.entries(counts).map(([label, count]) => <button key={label} onClick={() => setStatusFilter(label)} className={`whitespace-nowrap px-3 pb-3 text-[12px] font-medium border-b-2 transition-colors ${statusFilter === label ? "border-[#167D73] text-[#167D73]" : "border-transparent text-[#71859A] hover:text-[#173454]"}`}>{label} <span className="ml-1 text-[11px] text-[#9AA8B3]">{count}</span></button>)}
          </div>

          <div className="mt-5 rounded-2xl border border-[#DDE5EA] bg-white px-3 py-2 shadow-[0_2px_12px_rgba(23,52,84,0.025)]">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#F7F9F9] px-3"><Search size={16} className="text-[#8A99A5]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs..." className="w-full bg-transparent text-[13px] text-[#173454] outline-none placeholder:text-[#9AA8B3]" /></div>
              <div className="flex gap-2 overflow-x-auto">
                <label className="relative"><SlidersHorizontal size={14} className="absolute left-3 top-3 text-[#8A99A5]" /><select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="h-10 max-w-[190px] appearance-none rounded-xl border border-[#DDE5EA] bg-white pl-9 pr-8 text-[12px] text-[#526A7D] outline-none"><option value="All">Country</option>{COUNTRIES.map((country) => <option key={country}>{country}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-[#8A99A5]" /></label>
                <label className="relative"><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 appearance-none rounded-xl border border-[#DDE5EA] bg-white px-3 pr-8 text-[12px] text-[#526A7D] outline-none"><option value="All">Job type</option>{types.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-3 top-3.5 text-[#8A99A5]" /></label>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-visible rounded-2xl border border-[#DDE5EA] bg-white shadow-[0_2px_12px_rgba(23,52,84,0.025)]">
            <div className="hidden md:grid grid-cols-[minmax(280px,1.5fr)_1.1fr_0.9fr_0.75fr_0.65fr_40px] gap-4 border-b border-[#EEF2F4] px-5 py-3 text-[10px] font-semibold tracking-[0.12em] text-[#8A99A5] uppercase"><span>Job title</span><span>Location</span><span>Job type</span><span>Status</span><span>Applications</span><span /></div>
            {loading ? <div className="px-5 py-16 text-center text-sm text-[#71859A]">Loading your jobs…</div> : filteredJobs.length === 0 ? (
              <div className="px-5 py-16 text-center"><div className="mx-auto max-w-md"><p className="text-base font-medium text-[#173454]">{jobs.length ? "No jobs match those filters" : "Your job list is ready"}</p><p className="mt-2 text-sm text-[#71859A]">{jobs.length ? "Try a different search or filter." : "Create your first opening when you're ready."}</p>{!jobs.length && <Link href="/employer/jobs/new" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-sm font-medium text-white">Post a job <ArrowIcon /></Link>}</div></div>
            ) : filteredJobs.map((job) => {
              const applications = applicationCounts[job.id] ?? job.applicant_count ?? 0;
              return <div key={job.id} className="relative grid md:grid-cols-[minmax(280px,1.5fr)_1.1fr_0.9fr_0.75fr_0.65fr_40px] gap-3 md:gap-4 border-b border-[#EEF2F4] px-5 py-4 last:border-b-0 hover:bg-[#FCFDFD] items-center">
                <Link href={`/employer/jobs/${job.id}`} className="min-w-0"><span className="block truncate text-[14px] font-medium text-[#173454] hover:text-[#167D73]">{job.title}</span><span className="mt-1 block text-[11px] text-[#9AA8B3]">{job.career_track ?? "Role"}</span></Link>
                <span className="flex items-center gap-1.5 text-[12px] text-[#526A7D]"><MapPin size={13} className="text-[#9AA8B3]" />{job.location}</span>
                <span className="text-[12px] text-[#526A7D]">{job.employment_type}</span>
                <span><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${statusClass(job.status)}`}>{displayStatus(job.status)}</span></span>
                <Link href={`/employer/applicants?job=${job.id}`} className="text-[13px] font-medium text-[#173454] hover:text-[#167D73]">{applications}</Link>
                <div className="relative flex justify-end"><button onClick={() => setMenuId(menuId === job.id ? null : job.id)} className="rounded-lg p-2 text-[#71859A] hover:bg-[#F2F6F5] hover:text-[#173454]" aria-label={`Actions for ${job.title}`}><MoreHorizontal size={17} /></button>{menuId === job.id && <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#DDE5EA] bg-white p-1.5 shadow-[0_14px_35px_rgba(23,52,84,0.14)]"><Link href={`/employer/jobs/${job.id}`} onClick={() => setMenuId(null)} className="block rounded-lg px-3 py-2 text-xs text-[#526A7D] hover:bg-[#F5F8F8]">View job</Link><Link href={`/employer/jobs/${job.id}/edit`} onClick={() => setMenuId(null)} className="block rounded-lg px-3 py-2 text-xs text-[#526A7D] hover:bg-[#F5F8F8]">Edit job</Link>{displayStatus(job.status) === "Open" && <button onClick={() => changeStatus(job,"paused")} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#526A7D] hover:bg-[#F5F8F8]">Pause job</button>}{displayStatus(job.status) === "Paused" && <button onClick={() => changeStatus(job,"active")} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#526A7D] hover:bg-[#F5F8F8]">Resume job</button>}{displayStatus(job.status) !== "Closed" && <button onClick={() => changeStatus(job,"closed")} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#B34E3E] hover:bg-[#FDF5F3]">Close job</button>}<button onClick={() => duplicate(job)} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-[#526A7D] hover:bg-[#F5F8F8]">Duplicate</button><div className="my-1 border-t border-[#EEF2F4]" /><button onClick={() => deleteJob(job)} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-[#B34E3E] hover:bg-[#FDF5F3]">Delete job</button></div>}</div>
              </div>;
            })}
          </div>
          <p className="mt-4 text-[11px] text-[#9AA8B3]">Applications opens the Applicants tab filtered to this job. Jobs stays focused on the roles themselves.</p>
        </div>
      </div>
    </EmployerShell>
  );
}

function ArrowIcon(){return <span aria-hidden>→</span>}
