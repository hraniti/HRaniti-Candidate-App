"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CAREER_TRACKS, CareerTrack } from "@/lib/types";
import { Target, Clock, ShieldCheck, ArrowLeft, ArrowRight } from "lucide-react";

const WORK_PREFS = ["Remote", "Hybrid", "On-site"];
const NOTICE_OPTIONS = ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days+"];
const INTL_OPTIONS = ["UAE", "Germany", "UK", "Remote Global"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED"];

// This page is Step 3 of the overall 5-step onboarding flow (resume, profile,
// preferences, availability, consent) — it has its own 5 internal
// sub-questions, tracked separately from the global step.
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
    <main className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "100vh" }}>
      {/* Left — brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden text-white" style={{ padding: "80px" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#4338CA] via-[#4A5CE0] to-[#38BDF8]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-96 w-[130%] rounded-[50%] bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-40 left-1/2 h-2 w-2 rounded-full bg-white/50"
        />

        <div className="relative">
          <div className="flex items-center gap-2" style={{ height: "42px" }}>
            <img src="/brand/logo-icon.png" alt="" style={{ height: "40px", width: "auto" }} />
            <span style={{ fontWeight: 700, fontSize: "22px", lineHeight: 1 }}>HRaniti</span>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 400, color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>
            Where change begins
          </p>
        </div>

        <div className="relative max-w-md">
          <h1 style={{ fontWeight: 700, fontSize: "40px", lineHeight: 1.15, marginBottom: "20px" }}>
            We&rsquo;re getting to know your <span className="text-cyan-300">goals.</span>
          </h1>
          <p style={{ fontWeight: 400, fontSize: "18px", lineHeight: 1.6, color: "rgba(255,255,255,0.8)", marginBottom: "40px" }}>
            These preferences help us match you with the right opportunities.
          </p>

          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Better matches</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Get recommendations that truly fit your skills and goals.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Save time</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  We&rsquo;ll show you only the opportunities that matter.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>You&rsquo;re in control</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Update your preferences anytime as your goals evolve.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div />
      </div>

      {/* Right — question card */}
      <div className="relative flex flex-col bg-paper" style={{ padding: "48px 72px" }}>
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontSize: "13px", color: "#3A4460" }}>STEP {GLOBAL_STEP} OF {GLOBAL_TOTAL}</span>
        </div>
        <div className="h-1 w-full rounded-full overflow-hidden mb-8" style={{ background: "#E1E4EA" }}>
          <div
            className="h-full transition-all"
            style={{ width: `${(GLOBAL_STEP / GLOBAL_TOTAL) * 100}%`, background: "#B9791F" }}
          />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full paper-card" style={{ maxWidth: "440px", padding: "36px" }}>
            <p className="font-mono" style={{ fontSize: "11px", color: "#8A93A6", marginBottom: "6px" }}>
              QUESTION {step} OF {total}
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
                <div className="mt-5 pt-5" style={{ borderTop: "1px dashed #E1E4EA" }}>
                  <label className="text-xs font-medium" style={{ color: "#3A4460" }}>
                    Specific role (optional)
                  </label>
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
                  <div className="mt-4 pt-4" style={{ borderTop: "1px dashed #E1E4EA" }}>
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
                    <label className="text-xs font-medium" style={{ color: "#3A4460" }}>
                      Current salary — annual, before tax
                    </label>
                    <div className="flex gap-2 mt-1">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="rounded-lg border border-line px-2 py-2.5 text-sm bg-white"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
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
                      <p className="text-[11px] mt-1" style={{ color: "#3A4460" }}>
                        ≈ {(Number(currentSalary) / 100000).toFixed(1)} LPA
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium" style={{ color: "#3A4460" }}>
                      Expected salary — annual, before tax
                    </label>
                    <input
                      type="number"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      placeholder={currency === "INR" ? "e.g. 1800000" : undefined}
                      className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
                    />
                    {currency === "INR" && expectedSalary && Number(expectedSalary) > 0 && (
                      <p className="text-[11px] mt-1" style={{ color: "#3A4460" }}>
                        ≈ {(Number(expectedSalary) / 100000).toFixed(1)} LPA
                      </p>
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

            <div className="flex items-center justify-between" style={{ marginTop: "28px" }}>
              <button
                onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line"
                style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 500, color: "#16213E" }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              {step < total ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg text-white"
                  style={{
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "linear-gradient(90deg, #4F46E5, #38BDF8)",
                  }}
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={finish}
                  className="inline-flex items-center gap-1.5 rounded-lg text-white disabled:opacity-60"
                  style={{
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    background: "linear-gradient(90deg, #4F46E5, #38BDF8)",
                  }}
                >
                  {saving ? "Saving…" : "Continue"} <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function QuestionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-ink mb-4" style={{ fontSize: "16px" }}>
        {label}
      </p>
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
