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
      <div className="w-full max-w-2xl mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl text-ink mb-2">
            Your company profile is complete!
          </h1>
          <div className="flex items-center justify-center gap-2 mb-1">
            {company.domain_verified ? (
              <Seal label="Verified Employer" confidence={100} stamp />
            ) : (
              <span className="font-mono text-[11px] tracking-widest text-gold uppercase">
                Verification pending
              </span>
            )}
          </div>
          <p className="text-ink-soft text-sm">
            {company.name || "Your company"} · {company.hq_location || "Location"}
          </p>
        </div>

        <div className="paper-card p-6 mb-6">
          <p className="text-sm font-medium text-ink mb-4">Next steps</p>
          <div className="space-y-3">
            <NextStep emoji="📝" label="Post your first job" href="/employer/jobs/new" />
            <NextStep emoji="🔍" label="Review your first shortlist" href="/employer/shortlist" />
          </div>
        </div>

        <div className="text-center">
          <Button onClick={() => router.push("/employer/jobs/new")}>
            Post your first job
          </Button>
        </div>
      </div>
    </main>
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
