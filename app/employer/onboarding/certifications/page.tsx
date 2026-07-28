"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import Field from "@/components/employer/Field";
import Chip from "@/components/employer/Chip";
import { CERTIFICATION_CATEGORIES } from "@/lib/employerTypes";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

export default function CertificationsStep() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certs, setCerts] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase
        .from("companies")
        .select("certifications")
        .eq("id", companyId)
        .single();
      if (data?.certifications) setCerts(data.certifications);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(c: string) {
    setCerts((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function save(nextPath: string) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const companyId = await getOrCreateCompanyId(supabase, user);
      await supabase
        .from("companies")
        .update({ certifications: certs, onboarding_step: "verify" })
        .eq("id", companyId);
    }
    setSaving(false);
    router.push(nextPath);
  }

  if (loading) return null;

  return (
    <StepShell
      step={5}
      total={6}
      eyebrow="Employer Onboarding"
      title="Any awards or certifications?"
      subtitle="Worth showing off — these build trust with candidates browsing your listings."
    >
      <div className="space-y-5 text-left">
        {Object.entries(CERTIFICATION_CATEGORIES).map(([cat, chips]) => (
          <Field label={cat} key={cat}>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <Chip key={c} label={c} active={certs.includes(c)} onClick={() => toggle(c)} />
              ))}
            </div>
          </Field>
        ))}

        <div className="flex gap-2 mt-2">
          <Button variant="secondary" onClick={() => router.push("/employer/onboarding/perks")}>
            Back
          </Button>
          <Button variant="ghost" onClick={() => save("/employer/onboarding/verify")}>
            Skip for now
          </Button>
          <Button className="flex-1 justify-center" loading={saving} onClick={() => save("/employer/onboarding/verify")}>
            Continue
          </Button>
        </div>
      </div>
    </StepShell>
  );
}
