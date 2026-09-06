"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";

const TIMEZONES = [
  "India Standard Time (IST)",
  "Gulf Standard Time (UAE/GST)",
  "Central European Time (Germany/CET)",
  "British Time (UK/GMT)",
  "US Eastern Time (ET)",
  "US Pacific Time (PT)",
  "Other",
];

export default function AvailabilityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
      if (data?.timezone) setTimezone(data.timezone);
    })();
  }, []);

  async function handleContinue() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ timezone: timezone || null }).eq("id", user.id);
    }
    setSaving(false);
    router.push("/onboarding/consent");
  }

  return (
    <StepShell
      step={4}
      total={5}
      title="Tell us about your availability"
      subtitle="This helps employers understand your timeline."
    >
      <div>
        <label className="text-xs font-medium text-ink-soft">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
        >
          <option value="" disabled>Select one</option>
          {TIMEZONES.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>

      <Button className="w-full justify-center mt-8" loading={saving} onClick={handleContinue}>
        Continue
      </Button>
    </StepShell>
  );
}
