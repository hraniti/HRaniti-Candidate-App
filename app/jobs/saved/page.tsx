"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Job } from "@/lib/types";
import JobCard from "@/components/jobs/JobCard";
import QuickApplyModal from "@/components/jobs/QuickApplyModal";

export default function SavedJobsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [quickApplyJob, setQuickApplyJob] = useState<Job | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: saved }, { data: applied }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("saved_jobs").select("job_id, jobs(*)").eq("user_id", user.id),
        supabase.from("applications").select("job_id").eq("user_id", user.id),
      ]);

      setProfile(p as Profile);
      setJobs(((saved as any[]) ?? []).map((s) => s.jobs).filter(Boolean));
      setAppliedIds(new Set((applied ?? []).map((a) => a.job_id)));
      setLoading(false);
    })();
  }, []);

  async function unsave(jobId: string) {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    await fetch("/api/jobs/save", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
  }

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="space-y-4">
      {jobs.length === 0 && (
        <p className="text-sm text-ink-soft italic text-center py-10">
          Nothing saved yet — bookmark jobs from Discover to see them here.
        </p>
      )}
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          profile={profile}
          saved={true}
          applied={appliedIds.has(job.id)}
          onToggleSave={unsave}
          onQuickApply={setQuickApplyJob}
        />
      ))}
      {quickApplyJob && (
        <QuickApplyModal
          job={quickApplyJob}
          profile={profile}
          onClose={() => setQuickApplyJob(null)}
          onSubmitted={() => {
            setAppliedIds((prev) => new Set(prev).add(quickApplyJob.id));
            setQuickApplyJob(null);
          }}
        />
      )}
    </div>
  );
}
