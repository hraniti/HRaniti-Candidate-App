"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Seal from "@/components/Seal";
import Button from "@/components/Button";
import EmployerHeader from "@/components/employer/EmployerHeader";
import type { Company } from "@/lib/employerTypes";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

export default function EmployerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobCount, setJobCount] = useState(0);
  const [unlockCount, setUnlockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase.from("companies").select("*").eq("id", companyId).single();
      setCompany(data as Company);

      const [{ count: jobs }, { count: unlocks }] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("candidate_unlocks").select("*", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      setJobCount(jobs ?? 0);
      setUnlockCount(unlocks ?? 0);

      setLoading(false);

      // Send anyone who hasn't finished onboarding back to wherever they left off.
      if (data && !data.onboarding_completed) {
        const step = data.onboarding_step || "company";
        router.replace(`/employer/onboarding/${step === "done" ? "company" : step}`);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !company) return null;

  return (
    <main className="min-h-screen bg-paper">
      <EmployerHeader />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="font-display text-2xl sm:text-3xl text-ink">
                {company.name || "Your company"}
              </h1>
              {company.domain_verified && <Seal label="Verified Employer" confidence={100} stamp />}
            </div>
            <p className="text-ink-soft text-sm">
              {company.hq_location || "Location not set"}
              {!company.domain_verified && (
                <span className="ml-2 font-mono text-[11px] tracking-widest text-gold uppercase">
                  Verification pending
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => router.push("/employer/jobs/new")}>Post a job</Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Active jobs" value={jobCount} />
          <StatCard label="Candidates unlocked" value={unlockCount} />
          <StatCard label="Plan" value={company.plan || "Free"} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="paper-card p-6">
            <p className="text-sm font-medium text-ink mb-4">Next steps</p>
            <div className="space-y-3">
              <NextStep emoji="📝" label="Post your first job" href="/employer/jobs/new" />
              <NextStep emoji="🔍" label="Review your shortlist" href="/employer/jobs" />
            </div>
          </div>

          <div className="paper-card p-6">
            <p className="text-sm font-medium text-ink mb-4">Company profile</p>
            <div className="space-y-2 text-sm text-ink-soft">
              <p>Industry: {company.industry || "—"}</p>
              <p>Company size: {company.size || "—"}</p>
              <p>Hiring locations: {company.locations?.join(", ") || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="paper-card p-5">
      <p className="text-xs font-medium text-ink-soft mb-1">{label}</p>
      <p className="font-display text-2xl text-ink">{value}</p>
    </div>
  );
}

function NextStep({ emoji, label, href }: { emoji: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 text-sm text-ink-soft hover:text-ink transition-colors"
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </a>
  );
}
