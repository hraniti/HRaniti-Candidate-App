"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import type { Job } from "@/lib/types";

export default function EmployerJobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });
      setJobs((data as Job[]) ?? []);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;

  return (
    <main className="min-h-screen bg-paper px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">
        <span className="font-display italic text-lg text-ink block text-center mb-8">HRaniti</span>

        <div className="flex justify-between items-center mb-6">
          <h1 className="font-display text-2xl text-ink">Your jobs</h1>
          <Button onClick={() => (window.location.href = "/employer/jobs/new")}>Post a job</Button>
        </div>

        {jobs.length === 0 ? (
          <div className="paper-card p-8 text-center">
            <p className="text-sm text-ink-soft mb-4">You haven't posted any jobs yet.</p>
            <Button onClick={() => (window.location.href = "/employer/jobs/new")}>
              Post your first job
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job: any) => (
              <div key={job.id} className="paper-card p-5 flex items-center justify-between">
                <div>
                  <p className="font-display text-lg text-ink">{job.title}</p>
                  <p className="text-xs text-ink-soft">
                    {job.location} · {job.employment_type} ·{" "}
                    <span className="font-mono">hraniti.com/jobs/{job.public_slug}</span>
                  </p>
                  <p className="text-xs text-ink-faint mt-1">
                    {job.views ?? 0} views · {job.unique_clicks ?? 0} clicks
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => (window.location.href = `/employer/shortlist?job=${job.public_slug}`)}
                >
                  View shortlist
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
