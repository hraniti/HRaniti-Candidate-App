"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, Lock, MessageSquare, Bell, ArrowRight } from "lucide-react";

const TOGGLES = [
  { key: "show_profile_to_recruiters", label: "Show my profile to recruiters", detail: "Master switch. Enables discovery." },
  { key: "allow_resume_download", label: "Allow employers to download my resume", detail: "Employers can download your resume." },
  { key: "show_assessments", label: "Show my assessments", detail: "Employers see your assessment results." },
  { key: "allow_direct_contact", label: "Allow employers to contact me directly", detail: "Recruiters can message you." },
  { key: "receive_match_alerts", label: "Receive job matching alerts", detail: "Email notifications for new matches." },
] as const;

const GLOBAL_STEP = 4;
const GLOBAL_TOTAL = 4;

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
            Control your <span className="text-cyan-300">visibility.</span>
          </h1>
          <p style={{ fontWeight: 400, fontSize: "18px", lineHeight: 1.6, color: "rgba(255,255,255,0.8)", marginBottom: "40px" }}>
            You&rsquo;re in control of who sees your profile. You can change these anytime under Account Settings.
          </p>

          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Eye size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Discovery, on your terms</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Decide exactly who can find and view your profile.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Your documents, protected</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Control whether employers can download your resume.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Contact, your way</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Choose whether recruiters can reach you directly.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div />
      </div>

      {/* Right — toggles card */}
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
          <div className="w-full paper-card" style={{ maxWidth: "480px", padding: "36px" }}>
            <p style={{ fontWeight: 700, fontSize: "20px", color: "#16213E", marginBottom: "4px" }}>
              Control your visibility
            </p>
            <p style={{ fontSize: "13px", color: "#8A93A6", marginBottom: "20px" }}>
              You can change these anytime under Account Settings.
            </p>

            <div className="divide-y divide-line">
              {TOGGLES.map((t) => (
                <div key={t.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                  <div className="pr-4">
                    <p className="text-sm font-medium" style={{ color: "#16213E" }}>{t.label}</p>
                    <p className="text-xs" style={{ color: "#8A93A6" }}>{t.detail}</p>
                  </div>
                  <Toggle
                    checked={values[t.key]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [t.key]: v }))}
                  />
                </div>
              ))}
            </div>

            <button
              disabled={saving}
              onClick={handleContinue}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg text-white disabled:opacity-60"
              style={{
                marginTop: "28px",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 600,
                background: "linear-gradient(90deg, #4F46E5, #38BDF8)",
              }}
            >
              {saving ? "Saving…" : "Go to Dashboard"} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </main>
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
