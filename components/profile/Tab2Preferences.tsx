"use client";

import { useState } from "react";
import { Profile } from "@/lib/types";
import { SectionCard, Field, inputClass } from "./shared";

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Manufacturing", "Retail",
  "Consulting", "Telecom", "Energy", "Education", "Government",
];
const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Permanent", "Contract", "Freelance"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];
const AVAILABILITY = ["Actively Looking", "Open to Opportunities", "Not Looking", "Freelancer Available", "Available for Contract"];
const NOTICE_OPTIONS = ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days+"];
const COUNTRIES = ["India", "UAE", "Germany", "UK", "USA", "Singapore", "Australia", "Canada"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
        active ? "bg-ink text-white border-ink" : "bg-white text-ink border-line hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}

export default function Tab2Preferences({
  profile,
  queueSave,
  saveNow,
}: {
  profile: Profile;
  queueSave: (patch: Partial<Profile>) => void;
  saveNow: () => void;
}) {
  const [industries, setIndustries] = useState<string[]>(profile.preferred_industries ?? []);
  const [workMode, setWorkMode] = useState<string[]>(profile.work_preference ?? []);
  const [employmentType, setEmploymentType] = useState<string[]>(profile.preferred_employment_type ?? []);
  const [countries, setCountries] = useState<string[]>(profile.preferred_locations ?? []);
  const [intlEnabled, setIntlEnabled] = useState(profile.international_opportunities_enabled);
  const [intlCountries, setIntlCountries] = useState<string[]>(profile.open_to_international ?? []);
  const [travelWillingness, setTravelWillingness] = useState(profile.travel_willingness ?? "");
  const [travelPercent, setTravelPercent] = useState(profile.travel_percent ?? 0);

  function toggle(list: string[], setList: (v: string[]) => void, key: keyof Profile, val: string) {
    const next = list.includes(val) ? list.filter((v) => v !== val) : [...list, val];
    setList(next);
    queueSave({ [key]: next } as Partial<Profile>);
  }

  return (
    <div>
      <SectionCard title="Industries & work mode">
        <Field label="Preferred industries" origin="From Onboarding Screen 5">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <Chip key={i} active={industries.includes(i)} onClick={() => toggle(industries, setIndustries, "preferred_industries", i)}>
                {i}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Preferred work mode" origin="From Onboarding Screen 5">
          <div className="flex flex-wrap gap-2">
            {WORK_MODES.map((w) => (
              <Chip key={w} active={workMode.includes(w)} onClick={() => toggle(workMode, setWorkMode, "work_preference", w)}>
                {w}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Preferred employment type">
          <div className="flex flex-wrap gap-2">
            {EMPLOYMENT_TYPES.map((t) => (
              <Chip key={t} active={employmentType.includes(t)} onClick={() => toggle(employmentType, setEmploymentType, "preferred_employment_type", t)}>
                {t}
              </Chip>
            ))}
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Compensation" >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current salary — annual, before tax (optional)" origin="From Onboarding Screen 5">
            <div className="flex gap-2">
              <select
                defaultValue={profile.salary_currency ?? "INR"}
                onChange={(e) => queueSave({ salary_currency: e.target.value })}
                className="rounded-lg border border-line px-2 py-2.5 text-sm bg-white"
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input
                type="number"
                defaultValue={profile.current_salary ?? ""}
                onChange={(e) => queueSave({ current_salary: e.target.value ? Number(e.target.value) : null })}
                onBlur={saveNow}
                placeholder={profile.salary_currency === "INR" ? "e.g. 1200000" : undefined}
                className={inputClass}
              />
            </div>
            {profile.salary_currency === "INR" && profile.current_salary ? (
              <p className="text-[11px] text-ink-soft mt-1">≈ {(profile.current_salary / 100000).toFixed(1)} LPA</p>
            ) : null}
          </Field>
          <Field label="Expected salary — annual, before tax" origin="From Onboarding Screen 5">
            <input
              type="number"
              defaultValue={profile.expected_salary ?? ""}
              onChange={(e) => queueSave({ expected_salary: e.target.value ? Number(e.target.value) : null })}
              onBlur={saveNow}
              placeholder={profile.salary_currency === "INR" ? "e.g. 1800000" : undefined}
              className={inputClass}
            />
            {profile.salary_currency === "INR" && profile.expected_salary ? (
              <p className="text-[11px] text-ink-soft mt-1">≈ {(profile.expected_salary / 100000).toFixed(1)} LPA</p>
            ) : null}
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Availability">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Availability status" origin="From Onboarding Screen 6">
            <select
              defaultValue={profile.availability_status ?? ""}
              onChange={(e) => queueSave({ availability_status: e.target.value })}
              className={inputClass}
            >
              <option value="" disabled>Select one</option>
              {AVAILABILITY.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Notice period" origin="From Onboarding Screen 6">
            <select
              defaultValue={profile.notice_period ?? ""}
              onChange={(e) => queueSave({ notice_period: e.target.value })}
              className={inputClass}
            >
              <option value="" disabled>Select one</option>
              {NOTICE_OPTIONS.map((n) => <option key={n}>{n}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-between mt-2 py-2">
          <div>
            <p className="text-sm text-ink">Open to negotiating a notice period buyout?</p>
          </div>
          <ToggleSwitch
            checked={profile.open_to_buyout}
            onChange={(v) => queueSave({ open_to_buyout: v })}
          />
        </div>
        <Field label="Willing to travel for work?">
          <div className="flex items-center gap-3 flex-wrap">
            {["Yes", "No", "Conditional"].map((v) => (
              <Chip
                key={v}
                active={travelWillingness === v}
                onClick={() => {
                  setTravelWillingness(v);
                  queueSave({ travel_willingness: v as Profile["travel_willingness"] });
                }}
              >
                {v}
              </Chip>
            ))}
            {travelWillingness === "Conditional" && (
              <input
                type="number"
                placeholder="% of time"
                defaultValue={travelPercent || ""}
                onChange={(e) => queueSave({ travel_percent: e.target.value ? Number(e.target.value) : null })}
                onBlur={saveNow}
                className="w-28 rounded-lg border border-line px-3 py-1.5 text-sm"
              />
            )}
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Location & international opportunities">
        <Field label="Preferred countries" origin="Pre-checked from Phase 1">
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <Chip key={c} active={countries.includes(c)} onClick={() => toggle(countries, setCountries, "preferred_locations", c)}>
                {c}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-ink">Open to international opportunities?</p>
          <ToggleSwitch
            checked={intlEnabled}
            onChange={(v) => {
              setIntlEnabled(v);
              queueSave({ international_opportunities_enabled: v });
            }}
          />
        </div>
        {intlEnabled && (
          <div className="flex flex-wrap gap-2 pt-2">
            {COUNTRIES.filter((c) => c !== "India").map((c) => (
              <Chip
                key={c}
                active={intlCountries.includes(c)}
                onClick={() => toggle(intlCountries, setIntlCountries, "open_to_international", c)}
              >
                {c}
              </Chip>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${checked ? "bg-verified" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
