"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import { INDUSTRIES, COMPANY_SIZES, HIRING_LOCATIONS } from "@/lib/employerTypes";
import Field from "@/components/employer/Field";
import Chip from "@/components/employer/Chip";
import EmployerInputStyles from "@/components/employer/EmployerInputStyles";

export default function CompanyInfoStep() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [hqLocation, setHqLocation] = useState("");
  const [hiringLocations, setHiringLocations] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // First time an employer lands here (right after signup), their `employers`
  // row may not exist yet (email flow) — create it, then load whatever's there.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("employers")
        .upsert(
          { id: user.id, business_email: user.email },
          { onConflict: "id", ignoreDuplicates: true }
        );

      const { data } = await supabase.from("employers").select("*").eq("id", user.id).single();
      if (data) {
        setCompanyName(data.company_name ?? "");
        setWebsite(data.website ?? "");
        setIndustry(data.industry ?? "");
        setCompanySize(data.company_size ?? "");
        setHqLocation(data.hq_location ?? "");
        setHiringLocations(data.hiring_locations ?? []);
        setDescription(data.description ?? "");
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleLocation(loc: string) {
    setHiringLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  }

  const canContinue =
    companyName.trim().length > 1 &&
    website.trim().length > 3 &&
    industry &&
    companySize &&
    hqLocation.trim().length > 1 &&
    hiringLocations.length > 0 &&
    description.trim().length > 0;

  async function handleContinue() {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("employers")
      .update({
        company_name: companyName,
        website,
        industry,
        company_size: companySize,
        hq_location: hqLocation,
        hiring_locations: hiringLocations,
        description,
        onboarding_step: "contact",
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/employer/onboarding/contact");
  }

  if (loading) return null;

  return (
    <StepShell
      step={1}
      total={6}
      eyebrow="Employer Onboarding"
      title="Tell candidates who you are"
      subtitle="This appears on every job post and shortlist notification you send."
    >
      <div className="space-y-4 text-left">
        <Field label="Company Name" required>
          <input
            className="input"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Technologies"
          />
        </Field>

        <Field label="Company Website" required>
          <input
            className="input"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Industry" required>
            <select className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">Select…</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Company Size" required>
            <select
              className="input"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
            >
              <option value="">Select…</option>
              {COMPANY_SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Headquarters Location" required hint="City, Country">
          <input
            className="input"
            value={hqLocation}
            onChange={(e) => setHqLocation(e.target.value)}
            placeholder="Bengaluru, India"
          />
        </Field>

        <Field label="Hiring Locations" required>
          <div className="flex flex-wrap gap-2">
            {HIRING_LOCATIONS.map((loc) => (
              <Chip
                key={loc}
                label={loc}
                active={hiringLocations.includes(loc)}
                onClick={() => toggleLocation(loc)}
              />
            ))}
          </div>
        </Field>

        <Field label="Company Description" required hint="100–300 words">
          <textarea
            className="input min-h-[110px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your company do?"
          />
        </Field>

        {error && <p className="text-sm text-alert">{error}</p>}

        <Button
          className="w-full justify-center mt-2"
          disabled={!canContinue}
          loading={saving}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>

      <EmployerInputStyles />
    </StepShell>
  );
}
