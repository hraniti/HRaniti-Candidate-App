"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import EmployerShell from "@/components/employer/EmployerShell";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";
import type { Job } from "@/lib/types";
import { Briefcase, Eye, MousePointerClick } from "lucide-react";

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
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      setJobs((data as Job[]) ?? []);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null;

  return (
    <EmployerShell jobCount={jobs.length}>
      <div className="px-6 sm:px-10 py-8 sm:py-10 max-w-5xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl text-ink">Your jobs</h1>
          <Button onClick={() => (window.location.href = "/employer/jobs/new")}>Post a job</Button>
        </div>

        {jobs.length === 0 ? (
          <div className="paper-card p-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-brandCoral-soft flex items-center justify-center mx-auto mb-4">
              <Briefcase size={20} className="text-brandCoral" />
            </div>
            <p className="text-sm text-ink-soft mb-4">You haven't posted any jobs yet.</p>
            <Button onClick={() => (window.location.href = "/employer/jobs/new")}>
              Post your first job
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {jobs.map((job: any) => (
              <div key={job.id} className="paper-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display text-lg text-ink">{job.title}</p>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-brandCyan-soft text-brandCyan-deep uppercase tracking-wide">
                    {job.status ?? "active"}
                  </span>
                </div>
                <p className="text-xs text-ink-soft mb-1">
                  {job.location} · {job.employment_type}
                </p>
                <p className="font-mono text-[11px] text-ink-faint mb-3">
                  hraniti.com/jobs/{job.public_slug}
                </p>
                <div className="flex items-center gap-4 text-xs text-ink-faint mb-4">
                  <span className="flex items-center gap-1">
                    <Eye size={13} /> {job.views ?? 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <MousePointerClick size={13} /> {job.unique_clicks ?? 0} clicks
                  </span>
                </div>
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={() => (window.location.href = `/employer/shortlist?job=${job.public_slug}`)}
                >
                  View shortlist
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </EmployerShell>
  );
}
