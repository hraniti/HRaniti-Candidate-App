"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Job } from "@/lib/types";
import { calcMatchScore, parseYearsExperience } from "@/lib/jobMatching";
import { convertToUSD } from "@/lib/currency";
import JobCard from "@/components/jobs/JobCard";
import QuickApplyModal from "@/components/jobs/QuickApplyModal";
import AutoMatchCard from "@/components/jobs/AutoMatchCard";
import { Search } from "lucide-react";

type FeedTab = "for_you" | "saved" | "applied" | "all";

export default function DiscoverPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedTab>("for_you");
  const [quickApplyJob, setQuickApplyJob] = useState<Job | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState<"any" | "junior" | "mid" | "senior">("any");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [minSalary, setMinSalary] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState("");
  const [visaOnly, setVisaOnly] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: j }, { data: saved }, { data: applied }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("jobs").select("*").order("created_at", { ascending: false }),
        supabase.from("saved_jobs").select("job_id").eq("user_id", user.id),
        supabase.from("applications").select("job_id").eq("user_id", user.id),
      ]);

      setProfile(p as Profile);
      setJobs((j as Job[]) ?? []);
      setSavedIds(new Set((saved ?? []).map((s) => s.job_id)));
      setAppliedIds(new Set((applied ?? []).map((a) => a.job_id)));
      // Pre-fill location filter from Phase 1, work mode from Phase 2, per spec.
      if (p?.preferred_locations?.[0]) setLocationFilter(p.preferred_locations[0]);
      if (p?.work_preference?.[0]) setWorkModeFilter(p.work_preference[0]);
      if (p?.salary_currency) setSalaryCurrency(p.salary_currency);
      const years = parseYearsExperience(p?.years_experience ?? null);
      setExperienceFilter(years >= 7 ? "senior" : years >= 3 ? "mid" : years > 0 ? "junior" : "any");
      setLoading(false);
    })();
  }, []);

  async function toggleSave(jobId: string) {
    const isSaved = savedIds.has(jobId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(jobId) : next.add(jobId);
      return next;
    });
    await fetch("/api/jobs/save", {
      method: isSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
  }

  async function toggleAutoMatch(v: boolean) {
    if (!profile) return;
    setProfile({ ...profile, auto_match_enabled: v });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ auto_match_enabled: v }).eq("id", user.id);
  }

  const filtered = useMemo(() => {
    let list = jobs;
    if (tab === "saved") list = list.filter((j) => savedIds.has(j.id));
    if (tab === "applied") list = list.filter((j) => appliedIds.has(j.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
    }
    if (locationFilter) list = list.filter((j) => j.location.toLowerCase().includes(locationFilter.toLowerCase()));
    if (workModeFilter) list = list.filter((j) => j.work_mode === workModeFilter);
    if (visaOnly) list = list.filter((j) => j.visa_sponsorship);
    if (urgentOnly) list = list.filter((j) => j.urgent_hiring);
    if (experienceFilter !== "any") {
      list = list.filter((j) => {
        if (experienceFilter === "junior") return j.min_experience_years <= 2;
        if (experienceFilter === "mid") return j.min_experience_years >= 3 && j.min_experience_years <= 6;
        return j.min_experience_years >= 7;
      });
    }
    if (minSalary.trim()) {
      const minUsd = convertToUSD(Number(minSalary), salaryCurrency);
      list = list.filter((j) => {
        const jobMaxUsd = convertToUSD(j.salary_max ?? j.salary_min ?? 0, j.salary_currency);
        return jobMaxUsd >= minUsd;
      });
    }

    if (tab === "for_you" && profile) {
      list = [...list].sort((a, b) => calcMatchScore(profile, b) - calcMatchScore(profile, a));
    }
    return list;
  }, [jobs, tab, search, locationFilter, workModeFilter, visaOnly, urgentOnly, experienceFilter, minSalary, salaryCurrency, savedIds, appliedIds, profile]);

  if (loading || !profile) {
    return <p className="font-mono text-sm text-ink-soft">Loading opportunities…</p>;
  }

  return (
    <div>
      <AutoMatchCard profile={profile} onToggle={toggleAutoMatch} />

      {applySuccess && (
        <div className="bg-verified/10 border border-verified/30 text-verified text-sm rounded-lg px-4 py-3 mb-4">
          Application submitted! Track it under the "Applied" tab.
        </div>
      )}

      {/* Feed tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {([
          ["for_you", "For You"],
          ["saved", "Saved"],
          ["applied", "Applied"],
          ["all", "All Jobs"],
        ] as [FeedTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
              tab === key ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="paper-card p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs or companies"
            className="w-full rounded-lg border border-line pl-8 pr-3 py-2 text-sm focus:border-ink outline-none"
          />
        </div>
        <input
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          placeholder="Location"
          className="rounded-lg border border-line px-3 py-2 text-sm w-32 focus:border-ink outline-none"
        />
        <select
          value={workModeFilter}
          onChange={(e) => setWorkModeFilter(e.target.value)}
          className="rounded-lg border border-line px-2 py-2 text-sm bg-white"
        >
          <option value="">Any work mode</option>
          <option>Remote</option>
          <option>Hybrid</option>
          <option>On-site</option>
        </select>
        <select
          value={experienceFilter}
          onChange={(e) => setExperienceFilter(e.target.value as typeof experienceFilter)}
          className="rounded-lg border border-line px-2 py-2 text-sm bg-white"
        >
          <option value="any">Any experience</option>
          <option value="junior">0–2 years</option>
          <option value="mid">3–6 years</option>
          <option value="senior">7+ years</option>
        </select>
        <div className="flex items-center gap-1">
          <select
            value={salaryCurrency}
            onChange={(e) => setSalaryCurrency(e.target.value)}
            className="rounded-lg border border-line px-1.5 py-2 text-sm bg-white"
          >
            <option>USD</option>
            <option>INR</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>AED</option>
          </select>
          <input
            type="number"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value)}
            placeholder="Min salary"
            className="w-28 rounded-lg border border-line px-2 py-2 text-sm focus:border-ink outline-none"
          />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input type="checkbox" checked={visaOnly} onChange={(e) => setVisaOnly(e.target.checked)} /> Visa Sponsorship
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
          <input type="checkbox" checked={urgentOnly} onChange={(e) => setUrgentOnly(e.target.checked)} /> Urgent Hiring
        </label>
      </div>

      <div className="space-y-4">
        {filtered.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            profile={profile}
            saved={savedIds.has(job.id)}
            applied={appliedIds.has(job.id)}
            onToggleSave={toggleSave}
            onQuickApply={setQuickApplyJob}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-ink-soft italic text-center py-10">No jobs match these filters yet.</p>
        )}
      </div>

      {quickApplyJob && (
        <QuickApplyModal
          job={quickApplyJob}
          profile={profile}
          onClose={() => setQuickApplyJob(null)}
          onSubmitted={() => {
            setAppliedIds((prev) => new Set(prev).add(quickApplyJob.id));
            setQuickApplyJob(null);
            setApplySuccess(true);
            setTimeout(() => setApplySuccess(false), 4000);
          }}
        />
      )}
    </div>
  );
}
