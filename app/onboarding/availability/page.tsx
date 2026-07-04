"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";

const AVAILABILITY_OPTIONS = [
  "Available Immediately",
  "Serving Notice",
  "Open to Opportunities",
  "Not Looking",
  "Freelancer",
];
const VISA_COUNTRIES = ["germany", "uae", "uk", "usa", "united states", "united kingdom"];
const VISA_STATUS_OPTIONS = [
  "Citizen",
  "Permanent Resident",
  "Work Visa",
  "Student Visa",
  "Needs Sponsorship",
];

export default function AvailabilityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [needsVisa, setNeedsVisa] = useState<boolean | null>(null);
  const [visaStatus, setVisaStatus] = useState("");
  const [showVisa, setShowVisa] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("preferred_locations")
        .eq("id", user.id)
        .single();
      const loc = (data?.preferred_locations?.[0] ?? "").toLowerCase();
      setShowVisa(VISA_COUNTRIES.some((c) => loc.includes(c)));
    })();
  }, []);

  async function handleContinue() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          availability_status: status || null,
          visa_required: showVisa ? needsVisa : null,
          visa_status: showVisa ? visaStatus || null : null,
        })
        .eq("id", user.id);
    }
    setSaving(false);
    router.push("/onboarding/consent");
  }

  return (
    <StepShell
      step={6}
      total={7}
      title="Tell us about your availability"
      subtitle="This helps employers understand your timeline."
    >
      <div>
        <label className="text-xs font-medium text-ink-soft">Availability status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
        >
          <option value="" disabled>Select one</option>
          {AVAILABILITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>

      {showVisa && (
        <div className="mt-6 pt-6 dashed-divider space-y-5">
          <div>
            <p className="text-sm font-medium text-ink mb-2">Do you require visa sponsorship?</p>
            <div className="flex gap-2">
              {["Yes", "No"].map((v) => (
                <button
                  key={v}
                  onClick={() => setNeedsVisa(v === "Yes")}
                  className={`rounded-full px-4 py-2 text-sm border ${
                    needsVisa === (v === "Yes") ? "bg-ink text-white border-ink" : "bg-white text-ink border-line"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Current visa status</label>
            <select
              value={visaStatus}
              onChange={(e) => setVisaStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
            >
              <option value="" disabled>Select one</option>
              {VISA_STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>
      )}

      <Button className="w-full justify-center mt-8" loading={saving} onClick={handleContinue}>
        Continue
      </Button>
    </StepShell>
  );
}
