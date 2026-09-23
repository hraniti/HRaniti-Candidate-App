"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/lib/types";
import { SectionCard, Field, inputClass } from "./shared";

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Permanent", "Contract", "Freelance"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];
const AVAILABILITY = ["Actively Looking","Open to Opportunities","Not Looking","Available for Contract","Freelancer Available"];
const NOTICE_OPTIONS = ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days+"];
const LOCATIONS = ["Bengaluru","Mumbai","Delhi / NCR","Hyderabad","Pune","Chennai","Kolkata","Ahmedabad","Dubai (UAE)","Abu Dhabi (UAE)","Berlin (Germany)","Frankfurt (Germany)","London (UK)","Remote / Anywhere"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${active ? "bg-ink text-white border-ink" : "bg-white text-ink border-line hover:border-ink/40"}`}>
      {children}
    </button>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${checked ? "bg-verified" : "bg-line"}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function Tab2Preferences({ profile, queueSave, saveNow }: { profile: Profile; queueSave: (patch: Partial<Profile>) => void; saveNow: () => void; }) {
  const router = useRouter();
  const [workMode, setWorkMode] = useState<string[]>(profile.work_preference ?? []);
  const [employmentType, setEmploymentType] = useState<string[]>(profile.preferred_employment_type ?? []);
  const [location, setLocation] = useState<string>(profile.preferred_locations?.[0] ?? "");
  const [noticePeriod, setNoticePeriod] = useState(profile.notice_period ?? "");
  const [lastWorkingDay, setLastWorkingDay] = useState(profile.last_working_day ?? "");
  const [salaryCurrency, setSalaryCurrency] = useState(profile.salary_currency ?? "INR");
  const [expectedCurrency, setExpectedCurrency] = useState(profile.expected_salary_currency ?? "INR");

  function toggleList(list: string[], setList: (v: string[]) => void, key: keyof Profile, val: string) {
    const next = list.includes(val) ? list.filter((v) => v !== val) : [...list, val];
    setList(next);
    queueSave({ [key]: next } as Partial<Profile>);
  }

  return (
    <div>
      <SectionCard title="Work mode">
        <Field label="How do you want to work?">
          <div className="flex flex-wrap gap-2">
            {WORK_MODES.map((w) => (<Chip key={w} active={workMode.includes(w)} onClick={() => toggleList(workMode, setWorkMode, "work_preference", w)}>{w}</Chip>))}
          </div>
        </Field>
        <Field label="Employment type">
          <div className="flex flex-wrap gap-2">
            {EMPLOYMENT_TYPES.map((t) => (<Chip key={t} active={employmentType.includes(t)} onClick={() => toggleList(employmentType, setEmploymentType, "preferred_employment_type", t)}>{t}</Chip>))}
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Location">
        <Field label="Where are you looking to work?">
          <select value={location} onChange={(e) => { setLocation(e.target.value); queueSave({ preferred_locations: e.target.value ? [e.target.value] : [] }); }} className={inputClass}>
            <option value="" disabled>Select a location</option>
            {LOCATIONS.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Availability">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current status">
            <select defaultValue={profile.availability_status ?? ""} onChange={(e) => queueSave({ availability_status: e.target.value })} className={inputClass}>
              <option value="" disabled>Select one</option>
              {AVAILABILITY.map((a) => (<option key={a}>{a}</option>))}
            </select>
          </Field>
          <Field label="Notice period">
            <select value={noticePeriod} onChange={(e) => { setNoticePeriod(e.target.value); queueSave({ notice_period: e.target.value }); }} className={inputClass}>
              <option value="" disabled>Select one</option>
              {NOTICE_OPTIONS.map((n) => (<option key={n}>{n}</option>))}
            </select>
          </Field>
        </div>
        {noticePeriod === "Immediate" && (
          <Field label="Last working day">
            <input type="date" value={lastWorkingDay} onChange={(e) => { setLastWorkingDay(e.target.value); queueSave({ last_working_day: e.target.value || null }); }} onBlur={saveNow} className={inputClass} />
          </Field>
        )}
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-ink">Open to notice period buyout?</p>
          <ToggleSwitch checked={profile.open_to_buyout} onChange={(v) => queueSave({ open_to_buyout: v })} />
        </div>
      </SectionCard>

      <SectionCard title="Compensation">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current salary (annual, before tax)">
            <div className="flex gap-2">
              <select value={salaryCurrency} onChange={(e) => { setSalaryCurrency(e.target.value); queueSave({ salary_currency: e.target.value }); }} className="rounded-lg border border-line px-2 py-2.5 text-sm bg-white">
                {CURRENCIES.map((c) => (<option key={c}>{c}</option>))}
              </select>
              <input type="number" defaultValue={profile.current_salary ?? ""} onChange={(e) => queueSave({ current_salary: e.target.value ? Number(e.target.value) : null })} onBlur={saveNow} placeholder="Optional" className={inputClass} />
            </div>
            {salaryCurrency === "INR" && profile.current_salary ? (<p className="text-[11px] text-ink-soft mt-1">≈ {(profile.current_salary / 100000).toFixed(1)} LPA</p>) : null}
          </Field>
          <Field label="Expected salary (annual, before tax)">
            <div className="flex gap-2">
              <select value={expectedCurrency} onChange={(e) => { setExpectedCurrency(e.target.value); queueSave({ expected_salary_currency: e.target.value }); }} className="rounded-lg border border-line px-2 py-2.5 text-sm bg-white">
                {CURRENCIES.map((c) => (<option key={c}>{c}</option>))}
              </select>
              <input type="number" defaultValue={profile.expected_salary ?? ""} onChange={(e) => queueSave({ expected_salary: e.target.value ? Number(e.target.value) : null })} onBlur={saveNow} placeholder="Optional" className={inputClass} />
            </div>
            {expectedCurrency === "INR" && profile.expected_salary ? (<p className="text-[11px] text-ink-soft mt-1">≈ {(profile.expected_salary / 100000).toFixed(1)} LPA</p>) : null}
          </Field>
        </div>
      </SectionCard>

      <div className="flex justify-end mt-4 mb-8">
        <button onClick={() => { saveNow(); router.push("/dashboard"); }} className="inline-flex items-center gap-2 rounded-lg text-white px-6 py-3 text-sm font-semibold" style={{ background: "linear-gradient(90deg, #4F46E5, #38BDF8)" }}>
          Save & Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
