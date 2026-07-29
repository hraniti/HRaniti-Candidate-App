"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Seal from "@/components/Seal";
import Button from "@/components/Button";
import EmployerShell from "@/components/employer/EmployerShell";
import type { Company } from "@/lib/employerTypes";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";
import { Briefcase, Users, Sparkles } from "lucide-react";

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

      if (data && !data.onboarding_completed) {
        const step = data.onboarding_step || "company";
        router.replace(`/employer/onboarding/${step === "done" ? "company" : step}`);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !company) return null;

  const firstName = company.primary_hr_contact_name?.split(" ")[0];

  // Honest, state-driven task list — no fabricated numbers. What shows here
  // reflects what's actually true about this company's account right now.
  const tasks: {
    tone: "coral" | "gold" | "violet" | "cyan";
    title: string;
    subtitle: string;
    cta: string;
    href: string;
  }[] = [];

  if (!company.domain_verified) {
    tasks.push({
      tone: "gold",
      title: "Verify your company",
      subtitle: "Verified employers get a badge shown on every job post.",
      cta: "Verify now",
      href: "/employer/onboarding/verify",
    });
  }
  if (jobCount === 0) {
    tasks.push({
      tone: "coral",
      title: "Post your first job",
      subtitle: "Free on every plan — takes about 2 minutes.",
      cta: "Post a job",
      href: "/employer/jobs/new",
    });
  } else if (unlockCount === 0) {
    tasks.push({
      tone: "violet",
      title: "Review your shortlist",
      subtitle: "You have jobs live — see who's matched so far.",
      cta: "View jobs",
      href: "/employer/jobs",
    });
  }
  if (tasks.length === 0) {
    tasks.push({
      tone: "cyan",
      title: "You're all set",
      subtitle: "Post another role to keep your pipeline growing.",
      cta: "Post a job",
      href: "/employer/jobs/new",
    });
  }

  const toneMap = {
    coral: { border: "border-brandCoral", bg: "bg-brandCoral-soft", text: "text-brandCoral" },
    gold: { border: "border-gold", bg: "bg-gold-soft", text: "text-gold-deep" },
    violet: { border: "border-brandViolet", bg: "bg-brandViolet-soft", text: "text-brandViolet" },
    cyan: { border: "border-brandCyan", bg: "bg-brandCyan-soft", text: "text-brandCyan-deep" },
  };

  return (
    <EmployerShell jobCount={jobCount}>
      <div className="px-6 sm:px-10 py-8 sm:py-10 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-ink mb-1">
              Good to see you{firstName ? `, ${firstName}` : ""} 👋
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-ink-soft text-sm">
                {company.name || "Your company"} · {company.hq_location || "Location not set"}
              </p>
              {company.domain_verified && <Seal label="Verified" confidence={100} stamp />}
            </div>
          </div>
          <Button onClick={() => router.push("/employer/jobs/new")}>Post a job</Button>
        </div>

        <p className="text-xs font-mono tracking-widest uppercase text-ink-faint mb-3">
          Today's tasks
        </p>
        <div className="space-y-3 mb-8">
          {tasks.map((t) => {
            const tone = toneMap[t.tone];
            return (
              <div
                key={t.title}
                className={`flex items-center justify-between gap-4 rounded-xl border-l-4 ${tone.border} ${tone.bg} px-5 py-4`}
              >
                <div>
                  <p className="text-sm font-medium text-ink">{t.title}</p>
                  <p className="text-xs text-ink-soft">{t.subtitle}</p>
                </div>
                <button
                  onClick={() => router.push(t.href)}
                  className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg bg-white border border-line ${tone.text} hover:bg-paper-deep transition-colors`}
                >
                  {t.cta}
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={Briefcase} tone="violet" label="Active jobs" value={jobCount} />
          <StatCard icon={Users} tone="coral" label="Candidates unlocked" value={unlockCount} />
          <StatCard icon={Sparkles} tone="cyan" label="Plan" value={company.plan || "Free"} />
        </div>
      </div>
    </EmployerShell>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Briefcase;
  tone: "violet" | "coral" | "cyan";
  label: string;
  value: string | number;
}) {
  const toneMap = {
    violet: { bg: "bg-brandViolet-soft", text: "text-brandViolet" },
    coral: { bg: "bg-brandCoral-soft", text: "text-brandCoral" },
    cyan: { bg: "bg-brandCyan-soft", text: "text-brandCyan-deep" },
  };
  const t = toneMap[tone];
  return (
    <div className="paper-card p-5">
      <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center mb-3`}>
        <Icon size={17} className={t.text} />
      </div>
      <p className="text-xs font-medium text-ink-soft mb-1">{label}</p>
      <p className="font-display text-2xl text-ink">{value}</p>
    </div>
  );
}
