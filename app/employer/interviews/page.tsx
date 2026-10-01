"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Clock3, UserRound, CheckCircle2, XCircle, Plus, ArrowRight, RefreshCw } from "lucide-react";
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
};

type Application = {
  id: string;
  user_id: string;
  job_id: string;
  status: string | null;
  pipeline_stage: string | null;
  applied_at: string;
};

type Candidate = {
  id: string;
  full_name: string | null;
  email: string | null;
  current_designation: string | null;
};

type Job = {
  id: string;
  title: string;
  location: string | null;
};

type Row = Interview & {
  application?: Application;
  candidate?: Candidate;
  job?: Job;
};

type Filter = "Upcoming" | "Requests" | "Completed" | "All";

const formatDateTime = (value?: string | null) => {
  if (!value) return "Time to be arranged";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const initials = (value?: string | null) =>
  (value ?? "Candidate").split(" ").filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase();

function statusTone(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "confirmed") return "bg-[#E7F3F1] text-[#167D73]";
  if (s === "completed") return "bg-[#F1F4F4] text-[#526A7D]";
  if (s === "cancelled" || s === "declined") return "bg-[#FFF4F1] text-[#B34E3E]";
  return "bg-[#FFF8E8] text-[#9A6A19]";
}

function isFuture(row: Row) {
  const value = row.confirmed_time ?? row.proposed_times?.[0];
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getTime() >= Date.now();
}

export default function InterviewsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("Upcoming");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const company = await getOrCreateCompanyId(supabase, user);
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id,title,location")
      .eq("company_id", company)
      .order("created_at", { ascending: false });

    const jobIds = (jobs ?? []).map(x => x.id);
    if (!jobIds.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: apps } = await supabase
      .from("applications")
      .select("id,user_id,job_id,status,pipeline_stage,applied_at")
      .in("job_id", jobIds)
      .order("applied_at", { ascending: false });

    const appIds = (apps ?? []).map(x => x.id);
    if (!appIds.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: interviews } = await supabase
      .from("interview_requests")
      .select("id,application_id,status,proposed_times,confirmed_time,requested_by,created_at")
      .in("application_id", appIds)
      .order("created_at", { ascending: false });

    const userIds = [...new Set((apps ?? []).map(x => x.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id,full_name,email,current_designation").in("id", userIds)
      : { data: [] };

    const appMap = new Map((apps ?? []).map(x => [x.id, x as Application]));
    const jobMap = new Map((jobs ?? []).map(x => [x.id, x as Job]));
    const profileMap = new Map((profiles ?? []).map(x => [x.id, x as Candidate]));

    setRows((interviews ?? []).map(x => ({
      ...(x as Interview),
      application: appMap.get(x.application_id ?? ""),
      job: jobMap.get(appMap.get(x.application_id ?? "")?.job_id ?? ""),
      candidate: profileMap.get(appMap.get(x.application_id ?? "")?.user_id ?? ""),
    })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(row => {
      const status = (row.status ?? "Requested").toLowerCase();
      const future = isFuture(row);
      const matchesFilter =
        filter === "All" ||
        (filter === "Upcoming" && (status === "confirmed" ? future : status !== "completed" && status !== "cancelled" && status !== "declined")) ||
        (filter === "Requests" && !["confirmed", "completed", "cancelled", "declined"].includes(status)) ||
        (filter === "Completed" && status === "completed");
      const hay = [
        row.candidate?.full_name,
        row.candidate?.email,
        row.job?.title,
        row.application?.pipeline_stage,
        row.status,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesFilter && (!q || hay.includes(q));
    });
  }, [rows, filter, query]);

  const counts = useMemo(() => ({
    upcoming: rows.filter(r => {
      const s = (r.status ?? "Requested").toLowerCase();
      return s === "confirmed" ? isFuture(r) : s !== "completed" && s !== "cancelled" && s !== "declined";
    }).length,
    requests: rows.filter(r => !["confirmed", "completed", "cancelled", "declined"].includes((r.status ?? "Requested").toLowerCase())).length,
    completed: rows.filter(r => (r.status ?? "").toLowerCase() === "completed").length,
  }), [rows]);

  async function createInterview() {
    if (!applicationId || !dateValue || !timeValue) {
      setNotice("Choose a candidate and proposed date and time.");
      return;
    }
    setSaving(true);
    setNotice("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNotice("Please sign in again.");
      setSaving(false);
      return;
    }
    const proposed = new Date(dateValue + "T" + timeValue);
    const { error } = await supabase.from("interview_requests").insert({
      application_id: applicationId,
      status: "Requested",
      proposed_times: [proposed.toISOString()],
      requested_by: user.id,
    });
    if (error) {
      setNotice(error.message);
    } else {
      setShowNew(false);
      setApplicationId("");
      setDateValue("");
      setTimeValue("");
      await load();
    }
    setSaving(false);
  }

  async function confirmInterview(row: Row, time: string) {
    if (!row.id) return;
    const { error } = await supabase.from("interview_requests").update({
      status: "Confirmed",
      confirmed_time: time,
    }).eq("id", row.id);
    if (!error) await load();
  }

  async function setStatus(row: Row, status: string) {
    const { error } = await supabase.from("interview_requests").update({ status }).eq("id", row.id);
    if (!error) await load();
  }

  const applicationOptions = rows
    .map(r => r.application)
    .filter((x): x is Application => Boolean(x))
    .filter((x, i, arr) => arr.findIndex(y => y.id === x.id) === i);

  return (
    <EmployerShell>
      <div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
        <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73] uppercase">HIRING</p>
              <h1 className="mt-2 font-display text-3xl text-[#173454]">Interviews</h1>
              <p className="mt-1 max-w-2xl text-sm text-[#71859A]">Coordinate candidate interviews, confirm times, and keep every interview request connected to the right application.</p>
            </div>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#126A62]">
              <Plus size={15} /> Schedule interview
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              ["Upcoming", counts.upcoming, "Confirmed interviews and open scheduling requests"],
              ["Requests", counts.requests, "Interviews waiting for confirmation"],
              ["Completed", counts.completed, "Interviews already completed"],
            ].map(([label, value, desc]) => (
              <button key={String(label)} onClick={() => setFilter(label as Filter)} className={"rounded-2xl border bg-white p-5 text-left transition " + (filter === label ? "border-[#B9DDD7] shadow-[0_5px_18px_rgba(23,52,84,0.05)]" : "border-[#DDE5EA] hover:border-[#C9D8DE]")}>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-[#8A99A5] uppercase">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#173454]">{value}</p>
                <p className="mt-1 text-[11px] leading-5 text-[#71859A]">{desc}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search candidate or job…" className="h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-4 text-xs text-[#173454] outline-none focus:border-[#A9D4CE]" />
            </div>
            <button onClick={() => setFilter("All")} className={"h-11 rounded-xl border px-4 text-xs " + (filter === "All" ? "border-[#B9DDD7] bg-[#E7F3F1] text-[#167D73]" : "border-[#DDE5EA] bg-white text-[#526A7D]")}>All interviews</button>
            <button onClick={load} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-4 text-xs text-[#526A7D] hover:border-[#B9DDD7]"><RefreshCw size={14} /> Refresh</button>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white">
            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-[#71859A]">Loading interviews…</div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#E7F3F1] text-[#167D73]"><CalendarDays size={20} /></span>
                <p className="mt-4 text-sm font-medium text-[#173454]">No interviews in this view</p>
                <p className="mt-1 text-xs text-[#71859A]">Schedule an interview from a candidate or use the button above.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF2F4]">
                {filtered.map(row => {
                  const candidate = row.candidate;
                  const application = row.application;
                  const proposed = row.proposed_times ?? [];
                  const primaryTime = row.confirmed_time ?? proposed[0] ?? null;
                  return (
                    <div key={row.id} className="px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7F3F1] text-[11px] font-semibold text-[#167D73]">{initials(candidate?.full_name)}</span>
                          <div className="min-w-0">
                            <Link href={"/employer/applicants/" + (application?.id ?? "")} className="text-sm font-semibold text-[#173454] hover:text-[#167D73]">{candidate?.full_name ?? "Candidate"}</Link>
                            <p className="mt-0.5 truncate text-xs text-[#71859A]">{candidate?.current_designation ?? "Applicant"} · {row.job?.title ?? "Job"}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#71859A]">
                              <span className={"rounded-full px-2.5 py-1 font-medium " + statusTone(row.status)}>{row.status ?? "Requested"}</span>
                              {application?.pipeline_stage && <span>Stage: {application.pipeline_stage}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="min-w-[210px]">
                          <p className="text-[10px] font-semibold tracking-[0.1em] text-[#8A99A5] uppercase">Interview time</p>
                          <p className="mt-1 flex items-center gap-2 text-xs text-[#526A7D]"><Clock3 size={13} /> {formatDateTime(primaryTime)}</p>
                          <p className="mt-1 text-[10px] text-[#9AA8B3]">Requested {formatDate(row.created_at)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          {row.status === "Requested" && proposed[0] && <button onClick={() => confirmInterview(row, proposed[0])} className="inline-flex items-center gap-1.5 rounded-xl bg-[#167D73] px-3 py-2 text-[11px] font-medium text-white"><CheckCircle2 size={13} /> Confirm</button>}
                          {row.status === "Confirmed" && <button onClick={() => setStatus(row, "Completed")} className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE5EA] bg-white px-3 py-2 text-[11px] font-medium text-[#526A7D]">Mark completed</button>}
                          {!["Completed", "Cancelled"].includes(row.status ?? "") && <button onClick={() => setStatus(row, "Cancelled")} className="inline-flex items-center gap-1.5 rounded-xl border border-[#F0D5CF] bg-white px-3 py-2 text-[11px] font-medium text-[#B34E3E]"><XCircle size={13} /> Cancel</button>}
                          <Link href={"/employer/applicants/" + (application?.id ?? "")} className="inline-flex items-center gap-1 text-[11px] text-[#167D73]">Candidate <ChevronRight size={13} /></Link>
                        </div>
                      </div>
                      {row.status === "Requested" && proposed.length > 1 && (
                        <div className="mt-4 ml-[52px] flex flex-wrap gap-2">
                          {proposed.map(time => <button key={time} onClick={() => confirmInterview(row, time)} className="rounded-lg border border-[#DDE5EA] bg-white px-3 py-2 text-[11px] text-[#526A7D] hover:border-[#B9DDD7]">{formatDateTime(time)}</button>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-5 text-[#9AA8B3]">
            Interview scheduling currently stores proposed and confirmed times against the application. Interviewer assignment, meeting links, scorecards, reminders, and calendar sync can be added once those workspace fields are enabled.
          </p>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173454]/20 px-5">
          <div className="w-full max-w-[520px] rounded-2xl border border-[#DDE5EA] bg-white p-6 shadow-[0_24px_70px_rgba(23,52,84,0.18)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] text-[#167D73] uppercase">INTERVIEW</p>
                <h2 className="mt-1 text-lg font-semibold text-[#173454]">Schedule interview</h2>
                <p className="mt-1 text-xs text-[#71859A]">Create a scheduling request connected to a candidate application.</p>
              </div>
              <button onClick={() => setShowNew(false)} className="text-xs text-[#71859A]">Close</button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-[11px] font-medium text-[#526A7D]">Candidate application</span>
                <select value={applicationId} onChange={e => setApplicationId(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs text-[#526A7D] outline-none focus:border-[#A9D4CE]">
                  <option value="">Select candidate…</option>
                  {applicationOptions.map(app => {
                    const candidate = rows.find(r => r.application_id === app.id)?.candidate;
                    const job = rows.find(r => r.application_id === app.id)?.job;
                    return <option key={app.id} value={app.id}>{candidate?.full_name ?? "Candidate"} · {job?.title ?? "Job"}</option>;
                  })}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="text-[11px] font-medium text-[#526A7D]">Proposed date</span><input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs text-[#526A7D] outline-none focus:border-[#A9D4CE]" /></label>
                <label className="block"><span className="text-[11px] font-medium text-[#526A7D]">Proposed time</span><input type="time" value={timeValue} onChange={e => setTimeValue(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs text-[#526A7D] outline-none focus:border-[#A9D4CE]" /></label>
              </div>
              {notice && <p className="rounded-xl bg-[#FFF8E8] px-3 py-2.5 text-xs text-[#9A6A19]">{notice}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowNew(false)} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs text-[#526A7D]">Cancel</button>
                <button disabled={saving} onClick={createInterview} className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50"><CalendarDays size={14} /> {saving ? "Saving…" : "Create request"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployerShell>
  );
}
