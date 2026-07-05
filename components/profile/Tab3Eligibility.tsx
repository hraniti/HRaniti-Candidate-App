"use client";

import { useState } from "react";
import { Profile, LanguageEntry } from "@/lib/types";
import { SectionCard, Field, inputClass } from "./shared";
import { Plus, Trash2 } from "lucide-react";

const VISA_STATUSES = ["Citizen", "Permanent Resident", "Work Visa", "Student Visa", "Needs Sponsorship"];
const PROFICIENCIES = ["Beginner", "Intermediate", "Professional", "Native"];
const COUNTRIES = ["India", "UAE", "Germany", "UK", "USA", "Singapore", "Australia", "Canada"];

export default function Tab3Eligibility({
  profile,
  queueSave,
  saveNow,
}: {
  profile: Profile;
  queueSave: (patch: Partial<Profile>) => void;
  saveNow: () => void;
}) {
  const [visaStatus, setVisaStatus] = useState(profile.visa_status ?? "");
  const [languages, setLanguages] = useState<LanguageEntry[]>(profile.languages ?? []);

  const showVisaExpiry = visaStatus && !["Citizen", "Permanent Resident"].includes(visaStatus);

  function updateLanguages(next: LanguageEntry[]) {
    setLanguages(next);
    queueSave({ languages: next });
  }

  return (
    <div>
      <SectionCard title="Nationality & visa">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nationality" origin="From Onboarding Screen 6">
            <select
              defaultValue={profile.nationality ?? ""}
              onChange={(e) => queueSave({ nationality: e.target.value })}
              className={inputClass}
            >
              <option value="" disabled>Select country</option>
              {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Current visa status" origin="From Onboarding Screen 6">
            <select
              value={visaStatus}
              onChange={(e) => {
                setVisaStatus(e.target.value);
                queueSave({ visa_status: e.target.value });
              }}
              className={inputClass}
            >
              <option value="" disabled>Select one</option>
              {VISA_STATUSES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          {showVisaExpiry && (
            <Field label="Visa expiry date">
              <input
                type="date"
                defaultValue={profile.visa_expiry_date ?? ""}
                onChange={(e) => queueSave({ visa_expiry_date: e.target.value })}
                onBlur={saveNow}
                className={inputClass}
              />
            </Field>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Current location">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Country" origin="From Onboarding Screen 6">
            <input
              defaultValue={profile.current_country ?? ""}
              onChange={(e) => queueSave({ current_country: e.target.value })}
              onBlur={saveNow}
              className={inputClass}
            />
          </Field>
          <Field label="State / Province" origin="From Onboarding Screen 6">
            <input
              defaultValue={profile.state_province ?? ""}
              onChange={(e) => queueSave({ state_province: e.target.value })}
              onBlur={saveNow}
              className={inputClass}
            />
          </Field>
          <Field label="City" origin="From Onboarding Screen 6">
            <input
              defaultValue={profile.city ?? ""}
              onChange={(e) => queueSave({ city: e.target.value })}
              onBlur={saveNow}
              className={inputClass}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Languages" right={<span className="text-xs text-ink-soft">From Resume</span>}>
        <div className="space-y-2 mb-3">
          {languages.map((l, i) => (
            <div key={i} className="flex items-center gap-3 border border-line rounded-lg px-3 py-2">
              <input
                value={l.name}
                onChange={(e) => {
                  const next = [...languages];
                  next[i] = { ...l, name: e.target.value };
                  updateLanguages(next);
                }}
                placeholder="Language"
                className={`${inputClass} flex-1`}
              />
              <select
                value={l.proficiency}
                onChange={(e) => {
                  const next = [...languages];
                  next[i] = { ...l, proficiency: e.target.value as LanguageEntry["proficiency"] };
                  updateLanguages(next);
                }}
                className={`rounded-lg border px-2 py-2 text-sm bg-white ${
                  l.proficiency === "Review Required" ? "border-gold text-gold" : "border-line"
                }`}
              >
                <option value="Review Required">⚠ Review Required</option>
                {PROFICIENCIES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <button onClick={() => updateLanguages(languages.filter((_, idx) => idx !== i))} className="text-ink-soft hover:text-alert">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => updateLanguages([...languages, { name: "", proficiency: "Review Required" }])}
          className="inline-flex items-center gap-1.5 text-sm text-ink hover:text-ink-light"
        >
          <Plus size={14} /> Add language
        </button>
      </SectionCard>
    </div>
  );
}
