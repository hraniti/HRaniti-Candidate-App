"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile, CAREER_TRACKS, CareerTrack } from "@/lib/types";
import { calcCompleteness } from "@/lib/completeness";
import Button from "@/components/Button";
import Seal from "@/components/Seal";
import { Plus, X, Pencil, CheckCircle2 } from "lucide-react";

type CoreFieldKey =
  | "current_company"
  | "current_designation"
  | "years_experience"
  | "notice_period"
  | "current_location";

const CORE_FIELD_MAP: { label: string; key: CoreFieldKey }[] = [
  { label: "Current Company", key: "current_company" },
  { label: "Current Designation", key: "current_designation" },
  { label: "Years of Experience", key: "years_experience" },
  { label: "Notice Period", key: "notice_period" },
  { label: "Current Location", key: "current_location" },
];

export default function AIProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [coreFields, setCoreFields] = useState({
    current_company: "",
    current_designation: "",
    years_experience: "",
    notice_period: "",
    current_location: "",
  });

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const p = data as Profile;
      setProfile(p);
      if (p) {
        setCoreFields({
          current_company: p.current_company ?? "",
          current_designation: p.current_designation ?? "",
          years_experience: p.years_experience ?? "",
          notice_period: p.notice_period ?? "",
          current_location: p.current_location ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center">
        <p className="font-mono text-sm text-ink-soft">Loading your profile…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-ink mb-4">We couldn't find a profile yet.</p>
          <Button onClick={() => router.push("/onboarding/resume")}>Upload a resume</Button>
        </div>
      </main>
    );
  }

  const conf = profile.ai_confidence ?? {
    personal_info: 0,
    professional_summary: 0,
    experience: 0,
    education: 0,
    skills: 0,
    certifications: 0,
  };
  const completeness = calcCompleteness(profile);
  const qualifiedJobs = Math.max(4, Math.round(completeness / 6));

  async function save(patch: Partial<Profile>) {
    setSaving(true);
    setProfile((p) => (p ? { ...p, ...patch } : p));
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update(patch).eq("id", user.id);
    }
    setSaving(false);
  }

  function addSkill() {
    if (!newSkill.trim() || !profile) return;
    save({ skills: [...(profile.skills ?? []), newSkill.trim()] });
    setNewSkill("");
  }

  function removeSkill(skill: string) {
    if (!profile) return;
    save({ skills: (profile.skills ?? []).filter((s) => s !== skill) });
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">
        <span className="font-display italic text-lg text-ink block mb-6">HRaniti</span>

        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-2">Your AI Career Profile</h1>
        <p className="text-ink-soft mb-6 text-[15px] leading-relaxed">
          We extracted the following information from your resume. Review everything and make changes if needed.
        </p>

        <div className="paper-card p-5 mb-6 bg-verified/[0.04]">
          <p className="font-medium text-ink mb-1">🎉 We analyzed your profile!</p>
          <p className="text-sm text-ink-soft">Profile Completeness: <span className="font-mono text-ink">{completeness}%</span></p>
          <p className="text-sm text-ink-soft">You qualify for <span className="font-mono text-ink">{qualifiedJobs}</span> jobs.</p>
          {profile.skills && profile.skills.length > 0 && (
            <p className="text-sm text-ink-soft">Top skills: {profile.skills.slice(0, 3).join(", ")}</p>
          )}
        </div>

        {/* Career track */}
        <section className="paper-card p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-ink">Career track</h2>
          </div>
          <select
            value={profile.career_track ?? ""}
            onChange={(e) => save({ career_track: e.target.value as CareerTrack })}
            className="w-full rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
          >
            <option value="" disabled>Select a track</option>
            {CAREER_TRACKS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </section>

        {/* Personal info + core recruiter filters */}
        <Section title="Personal info" confidence={conf.personal_info}>
          <Field label="Full name" value={profile.full_name} onSave={(v) => save({ full_name: v })} />
          <Field label="Phone" value={profile.phone} onSave={(v) => save({ phone: v })} />
          <Field
            label="LinkedIn URL"
            value={profile.linkedin_url}
            onSave={(v) => save({ linkedin_url: v })}
            verified={profile.signup_provider === "linkedin_oidc" && !!profile.linkedin_url}
          />
        </Section>

        <section className="paper-card p-6 mb-4 border-gold/60">
          <h2 className="font-medium text-ink mb-1">Recruiter search filters</h2>
          <p className="text-xs text-ink-soft mb-4">Keep these current — they're what recruiters filter on first.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CORE_FIELD_MAP.map(({ label, key }) => {
              const required = key === "notice_period" || key === "current_location";
              const empty = required && !coreFields[key];
              return (
                <div key={key}>
                  <label className="text-xs font-medium text-ink-soft">
                    {label} {required && <span className="text-alert">*</span>}
                  </label>
                  <input
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-ink outline-none ${
                      empty ? "border-alert/50 bg-alert/5" : "border-line"
                    }`}
                    value={coreFields[key]}
                    onChange={(e) => setCoreFields((f) => ({ ...f, [key]: e.target.value }))}
                    onBlur={() => save({ [key]: coreFields[key] } as Partial<Profile>)}
                  />
                  {empty && <p className="text-[11px] text-alert mt-1">Recruiters filter on this — worth filling in.</p>}
                </div>
              );
            })}
          </div>
        </section>

        <Section title="Professional summary" confidence={conf.professional_summary}>
          <Field
            multiline
            label=""
            value={profile.professional_summary}
            onSave={(v) => save({ professional_summary: v })}
          />
        </Section>

        <Section title="Skills" confidence={conf.skills}>
          <div className="flex flex-wrap gap-2 mb-3">
            {(profile.skills ?? []).map((s) => (
              <span key={s} className="inline-flex items-center gap-1 bg-paper border border-line rounded-full px-3 py-1 text-xs text-ink">
                {s}
                <button onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              placeholder="Add a skill"
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-ink outline-none"
            />
            <Button variant="secondary" onClick={addSkill}><Plus size={14} /> Add</Button>
          </div>
        </Section>

        <Section title="Experience" confidence={conf.experience}>
          {(profile.experience ?? []).length === 0 && <EmptyRow />}
          {(profile.experience ?? []).map((e, i) => (
            <div key={i} className="dashed-divider first:border-0 py-3">
              <p className="font-medium text-ink text-sm">{e.title} · {e.company}</p>
              <p className="text-xs text-ink-soft mb-1">{e.start_date} – {e.end_date}</p>
              <p className="text-sm text-ink-soft">{e.description}</p>
            </div>
          ))}
        </Section>

        <Section title="Education" confidence={conf.education}>
          {(profile.education ?? []).length === 0 && <EmptyRow />}
          {(profile.education ?? []).map((e, i) => (
            <div key={i} className="dashed-divider first:border-0 py-3">
              <p className="font-medium text-ink text-sm">{e.degree}, {e.field_of_study}</p>
              <p className="text-xs text-ink-soft">{e.institution} · {e.graduation_year}</p>
            </div>
          ))}
        </Section>

        <Section title="Certifications" confidence={conf.certifications}>
          {(profile.certifications ?? []).length === 0 && <EmptyRow />}
          {(profile.certifications ?? []).map((c, i) => (
            <div key={i} className="dashed-divider first:border-0 py-3">
              <p className="font-medium text-ink text-sm">{c.name}</p>
              <p className="text-xs text-ink-soft">{c.provider}{c.credential_id ? ` · ${c.credential_id}` : ""}</p>
            </div>
          ))}
        </Section>

        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            className="flex-1 justify-center"
            loading={saving}
            onClick={() => router.push("/onboarding/preferences")}
          >
            Looks Good — Continue
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/onboarding/preferences")}
          >
            Edit Profile Later
          </Button>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  confidence,
  children,
}: {
  title: string;
  confidence: number;
  children: React.ReactNode;
}) {
  return (
    <section className="paper-card p-6 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium text-ink">{title}</h2>
        <Seal label="AI confidence" confidence={confidence} />
      </div>
      {children}
    </section>
  );
}

function EmptyRow() {
  return <p className="text-sm text-ink-soft italic">Nothing here yet — add it manually.</p>;
}

function Field({
  label,
  value,
  onSave,
  multiline,
  verified,
}: {
  label: string;
  value: string | null;
  onSave: (v: string) => void;
  multiline?: boolean;
  verified?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  return (
    <div className="py-2">
      {label && (
        <label className="text-xs font-medium text-ink-soft flex items-center gap-1.5 mb-1">
          {label}
          {verified && (
            <span className="inline-flex items-center gap-0.5 text-verified text-[10px] font-mono normal-case">
              <CheckCircle2 size={10} /> Verified
            </span>
          )}
        </label>
      )}
      {editing ? (
        <div className="flex gap-2 items-start">
          {multiline ? (
            <textarea
              autoFocus
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-ink outline-none"
              rows={3}
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          ) : (
            <input
              autoFocus
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-ink outline-none"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            />
          )}
          <Button
            variant="secondary"
            onClick={() => {
              onSave(val);
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-ink">{value || "—"}</p>
          <button onClick={() => setEditing(true)} className="text-ink-soft hover:text-ink shrink-0">
            <Pencil size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
