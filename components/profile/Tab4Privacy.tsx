"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { SectionCard, Field, inputClass } from "./shared";
import Button from "@/components/Button";
import { Download, Eye, Copy, ShieldCheck, Lock } from "lucide-react";

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
            <h3 className="font-display text-xl text-ink mb-4">
              {showPreview === "employer" ? "Employer view" : "Search card preview"}
            </h3>
            <div className="paper-card p-4">
              <p className="font-medium text-ink">{profile.full_name}</p>
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
