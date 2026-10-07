"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, Filter, Plus, RefreshCw, Search, UsersRound, X } from "lucide-react";
import EmployerShell from "@/components/employer/EmployerShell";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

type View = "month" | "week" | "day";
type Candidate = { id: string; full_name: string | null; email: string | null };
type Job = { id: string; title: string; location: string | null };
type Application = { id: string; user_id: string; job_id: string; custom_fields?: Record<string, any> | null };
type TeamMember = { id: string; full_name: string | null; email: string | null; role: string | null };
type Interview = {
  id: string;
  application_id: string | null;
  status: string | null;
  confirmed_time: string | null;
  duration_minutes: number | null;
  interview_type: string | null;
  interview_mode: string | null;
  meeting_link: string | null;
  meeting_provider: string | null;
  interviewer_ids: string[] | null;
  candidate?: Candidate;
  job?: Job;
};

type CalendarEvent = {
  id: string;
  date: Date;
  kind: "Interview";
  title: string;
  subtitle: string;
  interview: Interview;
};

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  return x;
};
const formatTime = (d: Date, timeZone?: string | null) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timeZone || undefined });
const formatDate = (d: Date, timeZone?: string | null) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: timeZone || undefined });

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function icsStamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\\.\d{3}/, "");
}
function downloadCalendarFile(event: CalendarEvent) {
  const end = new Date(event.date.getTime() + (event.interview.duration_minutes ?? 60) * 60000);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HRANITI//Hiring Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + icsEscape(event.id) + "@hraniti",
    "DTSTAMP:" + icsStamp(new Date()),
    "DTSTART:" + icsStamp(event.date),
    "DTEND:" + icsStamp(end),
    "SUMMARY:" + icsEscape(event.title + " · " + event.subtitle),
    "DESCRIPTION:" + icsEscape("HRANITI interview" + (event.interview.meeting_link ? "\\nMeeting: " + event.interview.meeting_link : "")),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "hraniti-interview-" + event.id + ".ics";
  a.click();
  URL.revokeObjectURL(url);
}
function googleCalendarUrl(event: CalendarEvent) {
  const end = new Date(event.date.getTime() + (event.interview.duration_minutes ?? 60) * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title + " · " + event.subtitle,
    dates: icsStamp(event.date) + "/" + icsStamp(end),
    details: "HRANITI interview" + (event.interview.meeting_link ? "\\nMeeting: " + event.interview.meeting_link : ""),
    location: event.interview.job?.location ?? "",
  });
  return "https://calendar.google.com/calendar/render?" + params.toString();
}
function outlookCalendarUrl(event: CalendarEvent) {
  const end = new Date(event.date.getTime() + (event.interview.duration_minutes ?? 60) * 60000);
  const params = new URLSearchParams({
    rru: "addevent",
    subject: event.title + " · " + event.subtitle,
    startdt: event.date.toISOString(),
    enddt: end.toISOString(),
    body: "HRANITI interview" + (event.interview.meeting_link ? "\\nMeeting: " + event.interview.meeting_link : ""),
    location: event.interview.job?.location ?? "",
  });
  return "https://outlook.live.com/calendar/0/deeplink/compose?" + params.toString();
}

function monthDays(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  return Array.from({ length: 42 }, (_, i) => addDays(startOfWeek(first), i));
}

export default function CalendarPage() {
  const supabase = createClient();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [jobsCount, setJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [interviewerId, setInterviewerId] = useState("all");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setInterviews([]);
      setLoading(false);
      return;
    }

    const companyId = await getOrCreateCompanyId(supabase, user);

    const [{ data: jobRows }, { data: memberRows }] = await Promise.all([
      supabase.from("jobs").select("id").eq("company_id", companyId),
      supabase.from("company_team_members").select("id,full_name,email,role").eq("company_id", companyId).eq("status", "Active").order("full_name"),
    ]);

    setJobsCount((jobRows ?? []).length);
    setMembers((memberRows ?? []) as TeamMember[]);

    const jobIds = (jobRows ?? []).map((row) => row.id);
    if (!jobIds.length) {
      setInterviews([]);
      setLoading(false);
      return;
    }

    const { data: applications } = await supabase.from("applications").select("id,user_id,job_id,custom_fields").in("job_id", jobIds);
    const appRows = (applications ?? []) as Application[];
    const appIds = appRows.map((row) => row.id);

    if (!appIds.length) {
      setInterviews([]);
      setLoading(false);
      return;
    }

    const [{ data: interviewRows }, { data: profiles }, { data: jobs }] = await Promise.all([
      supabase.from("interview_requests").select("id,application_id,status,confirmed_time,duration_minutes,interview_type,interview_mode,meeting_link,meeting_provider,interviewer_ids").in("application_id", appIds).order("confirmed_time"),
      supabase.from("profiles").select("id,full_name,email").in("id", appRows.map((row) => row.user_id)),
      supabase.from("jobs").select("id,title,location").in("id", jobIds),
    ]);

    const applicationMap = new Map(appRows.map((row) => [row.id, row]));
    const candidateMap = new Map(((profiles ?? []) as Candidate[]).map((row) => [row.id, row]));
    const jobMap = new Map(((jobs ?? []) as Job[]).map((row) => [row.id, row]));

    const result = ((interviewRows ?? []) as Interview[])
      .filter((row) => !!row.confirmed_time)
      .map((row) => {
        const app = applicationMap.get(row.application_id ?? "");
        const profile = candidateMap.get(app?.user_id ?? "");
        const demo = app?.custom_fields?.demo_candidate ? app.custom_fields : null;
        return {
          ...row,
          candidate: profile ? {
            ...profile,
            full_name: demo?.demo_name ?? profile.full_name,
            email: demo?.demo_email ?? profile.email,
          } : undefined,
          job: jobMap.get(app?.job_id ?? ""),
        };
      });

    setInterviews(result);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const events = useMemo<CalendarEvent[]>(() => interviews.map((interview) => ({
    id: interview.id,
    date: new Date(interview.confirmed_time as string),
    kind: "Interview" as const,
    title: interview.candidate?.full_name ?? "Candidate",
    subtitle: interview.job?.title ?? interview.interview_type ?? "Interview",
    interview,
  })).filter((event) => !Number.isNaN(event.date.getTime())), [interviews]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((event) => {
      const searchable = [event.title, event.subtitle, event.interview.job?.location, event.interview.interview_type].filter(Boolean).join(" ").toLowerCase();
      const textMatch = !q || searchable.includes(q);
      const interviewerMatch = interviewerId === "all" || (event.interview.interviewer_ids ?? []).includes(interviewerId);
      return textMatch && interviewerMatch;
    });
  }, [events, query, interviewerId]);

  const days = view === "month"
    ? monthDays(cursor)
    : view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
      : [selectedDate];

  const rangeTitle = view === "month"
    ? cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : view === "week"
      ? days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " – " + days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : formatDate(selectedDate);

  function move(direction: number) {
    if (view === "month") setCursor(addMonths(cursor, direction));
    else {
      const next = addDays(view === "week" ? startOfWeek(cursor) : selectedDate, direction * (view === "week" ? 7 : 1));
      setCursor(next);
      setSelectedDate(next);
    }
  }

  function today() {
    const now = new Date();
    setCursor(now);
    setSelectedDate(now);
  }

  const now = new Date();
  const upcoming = filtered.filter((event) => event.date.getTime() >= now.getTime()).slice(0, 6);
  const todayCount = filtered.filter((event) => sameDay(event.date, now)).length;

  return (
    <EmployerShell jobCount={jobsCount}>
      <div className="min-h-[calc(100vh-72px)] bg-[#FCFCFA]">
        <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#167D73]">HIRING</p>
              <h1 className="mt-2 font-display text-3xl text-[#173454]">Calendar</h1>
              <p className="mt-2 text-sm text-[#71859A]">One shared schedule for interviews and the hiring team.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={today} className="rounded-xl border border-[#DDE5EA] bg-white px-3 py-2 text-xs font-medium text-[#526A7D]">Today</button>
              <div className="flex overflow-hidden rounded-xl border border-[#DDE5EA] bg-white">
                <button onClick={() => move(-1)} className="p-2.5 text-[#71859A]"><ChevronLeft size={16} /></button>
                <button onClick={() => move(1)} className="border-l border-[#EEF2F4] p-2.5 text-[#71859A]"><ChevronRight size={16} /></button>
              </div>
              <div className="flex rounded-xl border border-[#DDE5EA] bg-white p-1">
                {(["month", "week", "day"] as View[]).map((item) => (
                  <button key={item} onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${view === item ? "bg-[#E7F3F1] text-[#167D73]" : "text-[#71859A]"}`}>
                    {item[0].toUpperCase() + item.slice(1)}
                  </button>
                ))}
              </div>
              <Link href="/employer/interviews" className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-xs font-medium text-white">
                <Plus size={15} /> Schedule interview
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#DDE5EA] bg-white">
              <div className="flex flex-col gap-3 border-b border-[#EEF2F4] p-3 lg:flex-row">
                <div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-[#F7F9F9] px-3">
                  <Search size={15} className="text-[#8A99A5]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search candidate, job or interview..." className="w-full bg-transparent text-xs text-[#173454] outline-none" />
                </div>
                <label className="relative flex h-10 items-center rounded-xl border border-[#DDE5EA] bg-white px-3">
                  <Filter size={13} className="mr-2 text-[#8A99A5]" />
                  <select value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)} className="bg-transparent text-xs text-[#526A7D] outline-none">
                    <option value="all">All interviewers</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{member.full_name ?? member.email ?? "Team member"}</option>)}
                  </select>
                </label>
                <button onClick={load} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#DDE5EA] bg-white px-3 text-xs text-[#526A7D]"><RefreshCw size={13} /> Refresh</button>
              </div>

              <div className="flex items-center justify-between border-b border-[#EEF2F4] px-5 py-4">
                <h2 className="text-base font-semibold text-[#173454]">{rangeTitle}</h2>
                <div className="flex items-center gap-3 text-[10px] text-[#8A99A5]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#167D73]" />Interviews</span></div>
              </div>

              {loading ? (
                <div className="flex min-h-[520px] items-center justify-center text-sm text-[#71859A]">Loading your hiring calendar…</div>
              ) : view === "month" ? (
                <div className="grid grid-cols-7">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => <div key={label} className="border-b border-r border-[#EEF2F4] px-3 py-2 text-[10px] font-semibold uppercase tracking-[.12em] text-[#9AA8B3]">{label}</div>)}
                  {days.map((date) => {
                    const dayEvents = filtered.filter((event) => sameDay(event.date, date));
                    const outside = date.getMonth() !== cursor.getMonth();
                    return (
                      <button key={dayKey(date)} onClick={() => { setSelectedDate(date); setView("day"); }} className={`min-h-[112px] border-b border-r border-[#EEF2F4] p-2 text-left align-top hover:bg-[#FCFDFD] ${outside ? "bg-[#FAFBFB]" : ""}`}>
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs ${sameDay(date, now) ? "bg-[#173454] font-semibold text-white" : "text-[#526A7D]"}`}>{date.getDate()}</span>
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 3).map((event) => <span key={event.id} onClick={(e) => { e.stopPropagation(); setSelected(event); }} className="block truncate rounded-md bg-[#E7F3F1] px-1.5 py-1 text-[10px] font-medium text-[#167D73]">{formatTime(event.date, event.interview.timezone)} · {event.title}</span>)}
                          {dayEvents.length > 3 && <span className="block text-[10px] text-[#9AA8B3]">+{dayEvents.length - 3} more</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-7">
                  {days.map((date) => {
                    const dayEvents = filtered.filter((event) => sameDay(event.date, date));
                    return (
                      <div key={dayKey(date)} className="border-r border-[#EEF2F4] p-3">
                        <div className={`mb-3 rounded-xl p-2 ${sameDay(date, now) ? "bg-[#E7F3F1]" : ""}`}>
                          <p className="text-[10px] uppercase tracking-[.1em] text-[#8A99A5]">{date.toLocaleDateString("en-GB", { weekday: "short" })}</p>
                          <p className="text-lg font-semibold text-[#173454]">{date.getDate()}</p>
                        </div>
                        <div className="space-y-2">
                          {dayEvents.length ? dayEvents.map((event) => (
                            <button key={event.id} onClick={() => setSelected(event)} className="w-full rounded-xl border border-[#DDE5EA] bg-white p-3 text-left hover:border-[#B9DDD7]">
                              <p className="text-[10px] font-semibold text-[#167D73]">{formatTime(event.date)}</p>
                              <p className="mt-1 text-xs font-medium text-[#173454]">{event.title}</p>
                              <p className="mt-1 text-[11px] text-[#71859A]">{event.subtitle}</p>
                            </button>
                          )) : <p className="py-8 text-center text-[11px] text-[#B0BBC3]">No events</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#167D73]">TODAY</p>
                <p className="mt-1 text-2xl font-semibold text-[#173454]">{todayCount}</p>
                <p className="text-xs text-[#71859A]">{todayCount === 1 ? "interview scheduled" : "interviews scheduled"} today</p>
              </section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#167D73]">UPCOMING</p>
                <div className="mt-4 space-y-2">
                  {upcoming.length ? upcoming.map((event) => (
                    <button key={event.id} onClick={() => setSelected(event)} className="w-full rounded-xl border border-[#EEF2F4] p-3 text-left hover:border-[#B9DDD7]">
                      <div className="flex gap-3">
                        <div className="rounded-lg bg-[#F7F9F9] p-2 text-[#167D73]"><CalendarDays size={14} /></div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-[#173454]">{event.title}</p>
                          <p className="mt-1 text-[10px] text-[#71859A]">{event.subtitle}</p>
                          <p className="mt-1 text-[10px] text-[#9AA8B3]">{event.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: event.interview.timezone || undefined })} · {formatTime(event.date, event.interview.timezone)}</p>
                        </div>
                      </div>
                    </button>
                  )) : <p className="py-5 text-xs text-[#9AA8B3]">No upcoming interviews.</p>}
                </div>
              </section>
              <section className="rounded-2xl border border-[#DDE5EA] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#8A99A5]">CONNECTED</p>
                <div className="mt-3 space-y-2">
                  <Link href="/employer/interviews" className="flex items-center gap-2 rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]"><Clock3 size={14} className="text-[#167D73]" /> Interviews</Link>
                  <Link href="/employer/applicants" className="flex items-center gap-2 rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]"><UsersRound size={14} className="text-[#167D73]" /> Applicants</Link>
                  <Link href="/employer/jobs" className="flex items-center gap-2 rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]">Jobs</Link>
                  <Link href="/employer/offers" className="flex items-center gap-2 rounded-xl bg-[#F8FBFA] px-3 py-3 text-xs text-[#526A7D]">Offers</Link>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173454]/20 p-5" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-[#DDE5EA] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#167D73]">INTERVIEW</p><h2 className="mt-2 text-xl font-semibold text-[#173454]">{selected.title}</h2><p className="mt-1 text-sm text-[#71859A]">{selected.subtitle}</p></div>
              <button onClick={() => setSelected(null)} aria-label="Close"><X size={18} className="text-[#8A99A5]" /></button>
            </div>
            <div className="mt-5 space-y-3 text-xs text-[#526A7D]">
              <p>{formatDate(selected.date, selected.interview.timezone)} · {formatTime(selected.date, selected.interview.timezone)} · {selected.interview.duration_minutes ?? 60} min</p>
              <p>{selected.interview.interview_mode ?? "Online"}{selected.interview.meeting_provider ? " · " + selected.interview.meeting_provider : ""}</p>
              {selected.interview.job?.location && <p>Location: {selected.interview.job.location}</p>}
              {selected.interview.meeting_link && <a href={selected.interview.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#167D73] px-4 py-2.5 text-white">Join meeting <ExternalLink size={13} /></a>}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/employer/interviews?application=${selected.interview.application_id ?? ""}`} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs font-medium text-[#526A7D]">Open interview</Link>
              {selected.interview.application_id && <Link href={`/employer/applicants/${selected.interview.application_id}`} className="rounded-xl border border-[#DDE5EA] px-4 py-2.5 text-xs font-medium text-[#526A7D]">Open applicant</Link>}
            </div>
            <div className="mt-3 border-t border-[#EEF2F4] pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#9AA8B3]">Add to calendar</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={googleCalendarUrl(selected)} target="_blank" rel="noreferrer" className="rounded-xl border border-[#DDE5EA] px-3 py-2 text-[11px] font-medium text-[#526A7D]">Google Calendar</a>
                <a href={outlookCalendarUrl(selected)} target="_blank" rel="noreferrer" className="rounded-xl border border-[#DDE5EA] px-3 py-2 text-[11px] font-medium text-[#526A7D]">Outlook</a>
                <button onClick={() => downloadCalendarFile(selected)} className="rounded-xl border border-[#DDE5EA] px-3 py-2 text-[11px] font-medium text-[#526A7D]">Download .ics</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployerShell>
  );
}
