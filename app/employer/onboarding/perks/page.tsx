"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import Field from "@/components/employer/Field";
import Chip from "@/components/employer/Chip";
import { PERK_CATEGORIES } from "@/lib/employerTypes";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

export default function PerksStep() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perks, setPerks] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase.from("companies").select("perks").eq("id", companyId).single();
      if (data?.perks) setPerks(data.perks);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(p: string) {
    setPerks((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function save(nextPath: string) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const companyId = await getOrCreateCompanyId(supabase, user);
      await supabase.from("companies").update({ perks, onboarding_step: "certifications" }).eq("id", companyId);
    }
    setSaving(false);
    router.push(nextPath);
  }

  if (loading) return null;

  return (
    <StepShell
      step={4}
      total={6}
      eyebrow="Employer Onboarding"
      title="What perks do you offer?"
      subtitle="Select chips rather than writing free text — this keeps job posts scannable."
    >
      <div className="space-y-5 text-left">
        {Object.entries(PERK_CATEGORIES).map(([cat, chips]) => (
          <Field label={cat} key={cat}>
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <Chip key={c} label={c} active={perks.includes(c)} onClick={() => toggle(c)} />
              ))}
            </div>
          </Field>
        ))}

        <div className="flex gap-2 mt-2">
          <Button variant="secondary" onClick={() => router.push("/employer/onboarding/branding")}>
            Back
          </Button>
          <Button variant="ghost" onClick={() => save("/employer/onboarding/certifications")}>
            Skip for now
          </Button>
          <Button className="flex-1 justify-center" loading={saving} onClick={() => save("/employer/onboarding/certifications")}>
            Continue
          </Button>
        </div>
      </div>
    </StepShell>
  );
}
