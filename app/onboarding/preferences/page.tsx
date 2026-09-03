"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import { CAREER_TRACKS, CareerTrack } from "@/lib/types";

const WORK_PREFS = ["Remote", "Hybrid", "On-site"];
const NOTICE_OPTIONS = ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days+"];
const INTL_OPTIONS = ["UAE", "Germany", "UK", "Remote Global"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

// This page is Step 3 of the overall 5-step onboarding flow (resume, profile,
// preferences, availability, consent) — it just has its own internal
// sub-questions within that one step, tracked separately below.
const GLOBAL_STEP = 3;
const GLOBAL_TOTAL = 5;

export default function PreferencesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState<CareerTrack | "">("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [intl, setIntl] = useState<string[]>([]);
  const [work, setWork] = useState<string[]>([]);
  const [currentSalary, setCurrentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("career_track, preferred_role")
        .eq("id", user.id)
        .single();
      // Pre-fill from the profile page's career track if it was already set
      // there (e.g. AI-inferred from an uploaded resume) — don't ask twice.
      if (data?.career_track) setCategory(data.career_track as CareerTrack);
      if (data?.preferred_role) setRole(data.preferred_role);
    })();
  }, []);

  const isInternational = location.trim() !== "" && !/india/i.test(location);
  const total = 5;

  function toggle(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  }

  async function finish() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({
          career_track: category || null,
          preferred_role: role || null,
          preferred_locations: location ? [location] : [],
          open_to_international: intl,
          work_preference: work,
          current_salary: currentSalary ? Number(currentSalary) : null,
          expected_salary: expectedSalary ? Number(expectedSalary) : null,
          salary_currency: currency,
          notice_period: notice || null,
          preferences_completed: true,
        })
        .eq("id", user.id);
    }
    setSaving(false);
    router.push("/onboarding/availability");
  }

  return (
    <StepShell
      step={GLOBAL_STEP}
      total={GLOBAL_TOTAL}
      title="Tell us what you're looking for"
      subtitle="This helps us match you with the right opportunities."
    >
      <p className="font-mono text-[11px] text-ink-faint tracking-wide mb-4">
        Question {step} of {total}
      </p>

      {step === 1 && (
        <QuestionBlock label="What category are you looking for?">
          <div className="flex flex-wrap gap-2">
            {CAREER_TRACKS.map((o) => (
              <Chip key={o} active={category === o} onClick={() => setCategory(o)}>
                {o}
              </Chip>
            ))}
          </div>
          <div className="mt-5 pt-5 dashed-divider">
            <label className="text-xs font-medium text-ink-soft">Specific role (optional)</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. SAP BASIS Consultant, ML Engineer"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
            />
          </div>
        </QuestionBlock>
      )}

      {step === 2 && (
        <QuestionBlock label="Where do you want to work?">
          <input
            autoFocus
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="India (default), or a city/country"
            className="w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
          />
          {isInternational && (
            <div className="mt-4 pt-4 dashed-divider">
              <p className="text-sm font-medium text-ink mb-2">Are you open to international opportunities?</p>
              <div className="flex flex-wrap gap-2">
                {INTL_OPTIONS.map((o) => (
                  <Chip key={o} active={intl.includes(o)} onClick={() => toggle(intl, setIntl, o)}>
                    {o}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </QuestionBlock>
      )}

      {step === 3 && (
        <QuestionBlock label="What is your work preference?">
          <div className="flex flex-wrap gap-2">
            {WORK_PREFS.map((o) => (
              <Chip key={o} active={work.includes(o)} onClick={() => toggle(work, setWork, o)}>
                {o}
              </Chip>
            ))}
          </div>
        </QuestionBlock>
      )}

      {step === 4 && (
        <QuestionBlock label="Salary (optional but helps employers match you)">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-soft">Current salary — annual, before tax</label>
              <div className="flex gap-2 mt-1">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-lg border border-line px-2 py-2.5 text-sm bg-white">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input
                  type="number"
                  value={currentSalary}
                  onChange={(e) => setCurrentSalary(e.target.value)}
                  placeholder={currency === "INR" ? "e.g. 1200000" : "Optional"}
                  className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
                />
              </div>
              {currency === "INR" && currentSalary && Number(currentSalary) > 0 && (
                <p className="text-[11px] text-ink-soft mt-1">≈ {(Number(currentSalary) / 100000).toFixed(1)} LPA</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft">Expected salary — annual, before tax</label>
              <input
                type="number"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
                placeholder={currency === "INR" ? "e.g. 1800000" : undefined}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
              />
              {currency === "INR" && expectedSalary && Number(expectedSalary) > 0 && (
                <p className="text-[11px] text-ink-soft mt-1">≈ {(Number(expectedSalary) / 100000).toFixed(1)} LPA</p>
              )}
            </div>
          </div>
        </QuestionBlock>
      )}

      {step === 5 && (
        <QuestionBlock label="What is your notice period?">
          <div className="flex flex-wrap gap-2">
            {NOTICE_OPTIONS.map((o) => (
              <Chip key={o} active={notice === o} onClick={() => setNotice(o)}>
                {o}
              </Chip>
            ))}
          </div>
        </QuestionBlock>
      )}

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
          className="text-sm text-ink-soft underline underline-offset-4"
        >
          Back
        </button>
        {step < total ? (
          <Button onClick={() => setStep(step + 1)}>Next</Button>
        ) : (
          <Button loading={saving} onClick={finish}>
            Continue
          </Button>
        )}
      </div>
      <button
        onClick={() => (step < total ? setStep(step + 1) : finish())}
        className="block mx-auto mt-4 text-xs text-ink-soft underline underline-offset-4"
      >
        Skip this question
      </button>
    </StepShell>
  );
}

function QuestionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-ink mb-4">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm border transition-colors ${
        active ? "bg-ink text-white border-ink" : "bg-white text-ink border-line hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}
