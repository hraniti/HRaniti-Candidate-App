"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { SectionCard, Field, inputClass } from "./shared";
import { anonymizedHandle } from "@/lib/anonymize";
import Button from "@/components/Button";
import { Download, Eye, Copy, ShieldCheck, Lock, KeyRound, Ban, X, TrendingUp } from "lucide-react";

const VISIBILITY_OPTIONS: Profile["profile_visibility"][] = ["Public", "Private", "Only to Employers I Apply To"];

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-40 ${checked ? "bg-verified" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function Tab4Privacy({
  profile,
  queueSave,
}: {
  profile: Profile;
  queueSave: (patch: Partial<Profile>) => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showPreview, setShowPreview] = useState<"employer" | "card" | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [slug, setSlug] = useState(profile.profile_slug ?? "");
  const [copied, setCopied] = useState(false);
  const [blockedEmployers, setBlockedEmployers] = useState<string[]>(profile.blocked_employers ?? []);
  const [newBlockedEmployer, setNewBlockedEmployer] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const connectedVia = profile.signup_provider ?? "email";

  function exportData() {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hraniti-profile-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function addBlockedEmployer() {
    const name = newBlockedEmployer.trim();
    if (!name || blockedEmployers.includes(name)) return;
    const next = [...blockedEmployers, name];
    setBlockedEmployers(next);
    queueSave({ blocked_employers: next });
    setNewBlockedEmployer("");
  }

  function removeBlockedEmployer(name: string) {
    const next = blockedEmployers.filter((e) => e !== name);
    setBlockedEmployers(next);
    queueSave({ blocked_employers: next });
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setPasswordStatus("saving");
    setPasswordError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordStatus("error");
      setPasswordError(error.message);
      return;
    }
    setPasswordStatus("done");
    setNewPassword("");
    setTimeout(() => {
      setShowChangePassword(false);
      setPasswordStatus("idle");
    }, 1500);
  }

  async function requestDeletion() {
    await supabase.from("profiles").update({ deletion_requested_at: new Date().toISOString() }).eq("id", profile.id);
    await supabase.auth.signOut();
    router.push("/signup");
  }

  const profileUrl = `hraniti.com/${slug || profile.id.slice(0, 8)}`;

  return (
    <div>
      <SectionCard title="Profile visibility">
        <Field label="Who can see your profile" origin="From Onboarding Screen 7">
          <select
            defaultValue={profile.profile_visibility}
            onChange={(e) => queueSave({ profile_visibility: e.target.value as Profile["profile_visibility"] })}
            className={inputClass}
          >
            {VISIBILITY_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>

        {[
          { key: "show_profile_to_recruiters", label: "Show my profile to recruiters", detail: "Master switch." },
          { key: "show_assessments", label: "Show my assessments", detail: "Controls visibility of assessment results." },
          { key: "show_video_pitch", label: "Show video pitch", detail: "Controls visibility of your AI voice/video interview output." },
          { key: "allow_resume_download", label: "Allow employers to download my resume", detail: "" },
          { key: "allow_direct_contact", label: "Allow employers to contact me directly", detail: "" },
        ].map((t) => (
          <div key={t.key} className="flex items-center justify-between py-3 dashed-divider first:border-0">
            <div>
              <p className="text-sm text-ink">{t.label}</p>
              {t.detail && <p className="text-xs text-ink-soft">{t.detail}</p>}
            </div>
            <ToggleSwitch
              checked={(profile as any)[t.key]}
              onChange={(v) => queueSave({ [t.key]: v } as Partial<Profile>)}
            />
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Notifications">
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-ink">Email notifications — new matches, interview requests</p>
          <ToggleSwitch checked={profile.receive_match_alerts} onChange={(v) => queueSave({ receive_match_alerts: v })} />
        </div>
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-ink">SMS notifications — time-sensitive interview reminders</p>
          <ToggleSwitch checked={profile.sms_notifications} onChange={(v) => queueSave({ sms_notifications: v })} />
        </div>
        <div className="flex items-center justify-between py-2 dashed-divider">
          <div>
            <p className="text-sm text-ink pt-2">AI Job Digest</p>
            <p className="text-xs text-ink-soft">How often you'd like a summary of new matches.</p>
          </div>
          <select
            defaultValue={profile.digest_frequency}
            onChange={(e) => queueSave({ digest_frequency: e.target.value as Profile["digest_frequency"] })}
            className="rounded-lg border border-line px-2 py-2 text-sm bg-white"
          >
            <option>Instant</option>
            <option>Daily</option>
            <option>Weekly</option>
            <option>Off</option>
          </select>
        </div>
      </SectionCard>

      <SectionCard title="Vetting & photo consent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink">Allow premium AI vetting matches</p>
            <p className="text-xs text-ink-soft">Contributes to Auto-Match eligibility. No photo is required to use HRaniti otherwise.</p>
          </div>
          <ToggleSwitch checked={profile.profile_photo_consent} onChange={(v) => queueSave({ profile_photo_consent: v })} />
        </div>
      </SectionCard>

      <SectionCard title="Connected accounts">
        {["Google", "LinkedIn"].map((provider) => {
          const isSignupProvider = connectedVia.toLowerCase().includes(provider.toLowerCase());
          return (
            <div key={provider} className="flex items-center justify-between py-2.5 dashed-divider first:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink">{provider}</span>
                {isSignupProvider && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono text-verified">
                    <ShieldCheck size={11} /> Used to sign in
                  </span>
                )}
              </div>
              <button
                disabled={isSignupProvider}
                title={isSignupProvider ? "Can't disconnect the account you sign in with" : ""}
                className="text-xs text-ink-soft underline underline-offset-4 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                {isSignupProvider && <Lock size={11} />}
                {isSignupProvider ? "Locked" : "Disconnect"}
              </button>
            </div>
          );
        })}
      </SectionCard>

      <SectionCard title="Block specific employers">
        <p className="text-xs text-ink-soft mb-3">
          Hide your profile from specific companies — useful if you'd rather your current employer didn't see you're looking.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {blockedEmployers.map((name) => (
            <span key={name} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3 py-1 text-xs text-ink">
              <Ban size={11} className="text-alert" /> {name}
              <button onClick={() => removeBlockedEmployer(name)} aria-label={`Unblock ${name}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          {blockedEmployers.length === 0 && <p className="text-xs text-ink-soft italic">No employers blocked.</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={newBlockedEmployer}
            onChange={(e) => setNewBlockedEmployer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addBlockedEmployer()}
            placeholder="Company name"
            className={`${inputClass} flex-1`}
          />
          <Button variant="secondary" onClick={addBlockedEmployer}>Block</Button>
        </div>
      </SectionCard>

      <SectionCard title="Subscription" right={<span className="text-[11px] font-mono text-gold">Test mode</span>}>
        <p className="text-xs text-ink-soft mb-3">
          Real billing (Stripe/Razorpay) isn't connected yet. Use this toggle to test Mock Interview, full Question
          Bank, and Video Pitch AI Coaching before payments go live.
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink">
            Plan: <span className="font-mono">{profile.subscription_tier === "paid" ? "Paid (test)" : "Free"}</span>
          </p>
          <ToggleSwitch
            checked={profile.subscription_tier === "paid"}
            onChange={(v) => queueSave({ subscription_tier: v ? "paid" : "free" })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Account security">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink">Password</p>
            <p className="text-xs text-ink-soft">Last changed — not tracked yet</p>
          </div>
          <Button variant="secondary" onClick={() => setShowChangePassword(true)}>
            <KeyRound size={14} /> Change Password
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Profile activity" right={<span className="text-[11px] font-mono text-ink-soft">Roadmap</span>}>
        <div className="flex items-center gap-2 text-ink-soft">
          <TrendingUp size={16} />
          <p className="text-sm">Employer view counts are coming in a future update.</p>
        </div>
      </SectionCard>

      <SectionCard title="Your profile link">
        <div className="flex items-center gap-2 mb-3">
          <input value={profileUrl} disabled className={`${inputClass} bg-paper text-ink-soft`} />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`https://${profileUrl}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="p-2.5 rounded-lg border border-line hover:border-ink/40"
          >
            <Copy size={14} />
          </button>
          {copied && <span className="text-xs text-verified">Copied</span>}
        </div>
        <Field label="Customize your profile URL (optional)">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            onBlur={() => queueSave({ profile_slug: slug || null })}
            placeholder="your-name"
            className={inputClass}
          />
        </Field>
        <div className="flex flex-wrap gap-3 mt-3">
          <Button variant="secondary" onClick={() => setShowPreview("employer")}>
            <Eye size={14} /> Preview Employer View
          </Button>
          <Button variant="secondary" onClick={() => setShowPreview("card")}>
            <Eye size={14} /> Preview Search Card
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Your data">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-ink-soft max-w-md">
            Download a full copy of your profile data, or permanently delete your account.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={exportData}>
              <Download size={14} /> Download My Data
            </Button>
            <Button variant="secondary" className="!text-alert !border-alert/40" onClick={() => setShowDelete(true)}>
              Delete Account
            </Button>
          </div>
        </div>
        <div className="mt-4 pt-4 dashed-divider text-xs text-ink-soft space-y-1">
          <p>✅ We use your data only to match you with jobs.</p>
          <p>✅ We never sell your resume or profile data.</p>
          <p>✅ We never use your data to train third-party AI models.</p>
          <p>✅ You control exactly what employers see.</p>
        </div>
      </SectionCard>

      {showPreview && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4" onClick={() => setShowPreview(null)}>
          <div className="bg-white rounded-card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl text-ink mb-1">
              {showPreview === "employer" ? "Employer view" : "Search card preview"}
            </h3>
            <p className="text-xs text-ink-soft mb-4">
              Your name and contact details stay hidden until an employer requests an interview.
            </p>
            <div className="paper-card p-4">
              <p className="font-medium text-ink font-mono text-sm">{anonymizedHandle(profile)}</p>
              <p className="text-sm text-ink-soft">{profile.current_designation} at {profile.current_company}</p>
              <p className="text-xs text-ink-soft mt-1">{profile.current_location}</p>
              {showPreview === "employer" && (
                <p className="text-sm text-ink-soft mt-3">{profile.professional_summary}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(profile.skills ?? []).slice(0, 5).map((s) => (
                  <span key={s} className="text-[11px] bg-paper border border-line rounded-full px-2 py-0.5">{s}</span>
                ))}
              </div>
            </div>
            <Button className="w-full justify-center mt-4" onClick={() => setShowPreview(null)}>Close</Button>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-card max-w-sm w-full p-6">
            <h3 className="font-display text-xl text-ink mb-2">Change your password</h3>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 characters)"
              className={`${inputClass} mb-2`}
            />
            {passwordError && <p className="text-sm text-alert mb-2">{passwordError}</p>}
            {passwordStatus === "done" && <p className="text-sm text-verified mb-2">Password updated.</p>}
            <div className="flex gap-3 mt-2">
              <Button
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordError(null);
                  setNewPassword("");
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1 justify-center" loading={passwordStatus === "saving"} onClick={changePassword}>
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-card max-w-sm w-full p-6">
            <h3 className="font-display text-xl text-ink mb-2">Delete your account?</h3>
            <p className="text-sm text-ink-soft mb-4">
              This will sign you out and flag your account for permanent deletion. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={inputClass}
            />
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 justify-center !bg-alert"
                disabled={deleteConfirm !== "DELETE"}
                onClick={requestDeletion}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
