"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";

const TOGGLES = [
  { key: "show_profile_to_recruiters", label: "Show my profile to recruiters", detail: "Master switch. Enables discovery." },
  { key: "allow_resume_download", label: "Allow employers to download my resume", detail: "Employers can download your resume." },
  { key: "show_assessments", label: "Show my assessments", detail: "Employers see your assessment results." },
  { key: "allow_direct_contact", label: "Allow employers to contact me directly", detail: "Recruiters can message you." },
  { key: "receive_match_alerts", label: "Receive job matching alerts", detail: "Email notifications for new matches." },
] as const;

export default function ConsentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, boolean>>(
    Object.fromEntries(TOGGLES.map((t) => [t.key, true]))
  );

  async function handleContinue() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update(values).eq("id", user.id);
    }
    setSaving(false);
    router.push("/dashboard");
  }

  return (
    <StepShell
      step={7}
      total={7}
      title="Control your visibility"
      subtitle="You're in control of who sees your profile. You can change these anytime under Account Settings."
    >
      <div className="divide-y divide-line">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="pr-4">
              <p className="text-sm font-medium text-ink">{t.label}</p>
              <p className="text-xs text-ink-soft">{t.detail}</p>
            </div>
            <Toggle
              checked={values[t.key]}
              onChange={(v) => setValues((prev) => ({ ...prev, [t.key]: v }))}
            />
          </div>
        ))}
      </div>

      <Button className="w-full justify-center mt-8" loading={saving} onClick={handleContinue}>
        Go to Dashboard
      </Button>
    </StepShell>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${checked ? "bg-verified" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
