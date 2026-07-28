"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import Field from "@/components/employer/Field";
import EmployerInputStyles from "@/components/employer/EmployerInputStyles";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

export default function BrandingStep() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [culture, setCulture] = useState("");
  const [benefits, setBenefits] = useState("");
  const [tagline, setTagline] = useState("");
  const [introVideo, setIntroVideo] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase.from("companies").select("*").eq("id", companyId).single();
      if (data) {
        setCulture(data.culture ?? "");
        setBenefits(data.benefits ?? "");
        setTagline(data.tagline ?? "");
        setIntroVideo(data.intro_video_url ?? "");
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(nextStep: string, nextPath: string) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const companyId = await getOrCreateCompanyId(supabase, user);
      await supabase
        .from("companies")
        .update({
          culture: culture || null,
          benefits: benefits || null,
          tagline: tagline || null,
          intro_video_url: introVideo || null,
          onboarding_step: nextStep,
        })
        .eq("id", companyId);
    }
    setSaving(false);
    router.push(nextPath);
  }

  if (loading) return null;

  return (
    <StepShell
      step={3}
      total={6}
      eyebrow="Employer Onboarding · Optional"
      title="Help you attract more candidates"
      subtitle="All optional — skip anything and come back later from your dashboard."
    >
      <div className="space-y-4 text-left">
        <Field label="Company Culture" hint="Optional">
          <textarea className="input min-h-[80px]" value={culture} onChange={(e) => setCulture(e.target.value)} />
        </Field>
        <Field label="Employee Benefits" hint="Optional">
          <textarea className="input min-h-[80px]" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
        </Field>
        <Field label="Why Join Us?" hint="Tagline, optional">
          <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
        <Field label="Company Intro Video" hint="YouTube/Vimeo link, optional">
          <input className="input" value={introVideo} onChange={(e) => setIntroVideo(e.target.value)} placeholder="https://youtube.com/..." />
        </Field>

        <div className="flex gap-2 mt-2">
          <Button variant="secondary" onClick={() => router.push("/employer/onboarding/contact")}>
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={() => save("perks", "/employer/onboarding/perks")}
          >
            Skip for now
          </Button>
          <Button
            className="flex-1 justify-center"
            loading={saving}
            onClick={() => save("perks", "/employer/onboarding/perks")}
          >
            Continue
          </Button>
        </div>
      </div>
      <EmployerInputStyles />
    </StepShell>
  );
}
