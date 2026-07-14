"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Profile,
  Experience,
  Education,
  Certification,
  SkillDetail,
  SkillCategory,
} from "@/lib/types";
import { SectionCard, Field, inputClass, RestoreAIButton, StarRating, DataOrigin } from "./shared";
import Seal from "@/components/Seal";
import Button from "@/components/Button";
import RegenerateModal from "./RegenerateModal";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Sparkles, FileText, CheckCircle2, Clock, Pin, PinOff, Upload, Loader2 } from "lucide-react";

const SKILL_CATEGORIES: SkillCategory[] = ["Technical", "Functional", "Soft Skills", "Languages"];
const CURRENT_YEAR = new Date().getFullYear();

function calcYearsFromExperience(experience: Experience[] | null): number | null {
  if (!experience || experience.length === 0) return null;
  const years = experience
    .map((e) => parseInt((e.start_date || "").match(/\d{4}/)?.[0] ?? "", 10))
    .filter((y) => !isNaN(y));
  if (years.length === 0) return null;
  const earliest = Math.min(...years);
  return Math.max(CURRENT_YEAR - earliest, 0);
}

export default function Tab1Professional({
  profile,
  queueSave,
  saveNow,
}: {
  profile: Profile;
  queueSave: (patch: Partial<Profile>) => void;
  saveNow: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [uploadingCertIdx, setUploadingCertIdx] = useState<number | null>(null);
  const [summary, setSummary] = useState(profile.professional_summary ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? "");
  const [education, setEducation] = useState<Education[]>(profile.education ?? []);
  const [experience, setExperience] = useState<Experience[]>(profile.experience ?? []);
  const [certifications, setCertifications] = useState<Certification[]>(profile.certifications ?? []);
  const [skills, setSkills] = useState<SkillDetail[]>(
    profile.skills_detail && profile.skills_detail.length > 0
      ? profile.skills_detail
      : (profile.skills ?? []).map((s) => ({
          name: s,
          category: "Technical" as SkillCategory,
          proficiency: 3,
          last_used: "Current",
          primary: false,
        }))
  );
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>("Technical");
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const calculatedYears = calcYearsFromExperience(experience) ?? profile.years_experience;

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // --- Present-role sync hook: mirror current experience to core recruiter fields ---
  function syncCurrentRole(exp: Experience[]) {
    const current = exp.find((e) => /present|current/i.test(e.end_date));
    if (current) {
      queueSave({ current_company: current.company, current_designation: current.title } as Partial<Profile>);
    }
  }

  function updateExperience(next: Experience[]) {
    setExperience(next);
    queueSave({ experience: next });
    syncCurrentRole(next);
  }

  function updateEducation(next: Education[]) {
    setEducation(next);
    queueSave({ education: next });
  }

  function updateCertifications(next: Certification[]) {
    setCertifications(next);
    queueSave({ certifications: next });
  }

  async function uploadCertificate(i: number, file: File) {
    setUploadingCertIdx(i);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("certificates").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("certificates").createSignedUrl(path, 60 * 60 * 24 * 365);
      const next = [...certifications];
      next[i] = { ...next[i], certificate_url: signed?.signedUrl ?? path };
      updateCertifications(next);
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingCertIdx(null);
    }
  }

  function updateSkills(next: SkillDetail[]) {
    setSkills(next);
    queueSave({ skills_detail: next, skills: next.map((s) => s.name) });
  }

  function togglePrimary(name: string) {
    const current = skills.find((s) => s.name === name);
    const primaryCount = skills.filter((s) => s.primary).length;
    if (!current?.primary && primaryCount >= 5) {
      setToast("You can only pin up to 5 primary skills. Unpin one to add this instead.");
      return;
    }
    updateSkills(skills.map((s) => (s.name === name ? { ...s, primary: !s.primary } : s)));
  }

  function restoreSummary() {
    if (profile.ai_snapshot?.professional_summary) {
      setSummary(profile.ai_snapshot.professional_summary);
      queueSave({ professional_summary: profile.ai_snapshot.professional_summary });
    }
  }

  const conf = profile.ai_confidence;

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50">
          {toast}
        </div>
      )}
      {showRegenerate && (
        <RegenerateModal
          onClose={() => setShowRegenerate(false)}
          onGenerated={(text) => {
            setSummary(text);
            queueSave({ professional_summary: text });
          }}
        />
      )}

      {/* Resume status */}
      <SectionCard title="Resume">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm text-ink">
            <FileText size={16} className="text-ink-soft" />
            {profile.resume_uploaded ? "Resume on file" : "No resume uploaded yet"}
            {profile.resume_uploaded && (
              <span className="inline-flex items-center gap-1 text-verified text-xs font-mono">
                <CheckCircle2 size={12} /> Active / Parsed
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/onboarding/resume")}>
              Replace Resume
            </Button>
            <button className="text-xs text-ink-soft underline underline-offset-4">🔗 Enhance from LinkedIn</button>
          </div>
        </div>
        <DataOrigin>From Phase 1 resume upload</DataOrigin>
      </SectionCard>

      {/* Personal info */}
      <SectionCard title="Personal info" right={conf && <Seal label="AI confidence" confidence={conf.personal_info} />}>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Full name" origin="From Resume">
            <input
              defaultValue={profile.full_name ?? ""}
              onChange={(e) => queueSave({ full_name: e.target.value })}
              onBlur={saveNow}
              className={inputClass}
            />
          </Field>
          <Field label="Email" origin="From Registration">
            <div className="flex items-center gap-2">
              <input value={profile.email ?? ""} disabled className={`${inputClass} bg-paper text-ink-soft`} />
              <CheckCircle2 size={16} className="text-verified shrink-0" />
            </div>
          </Field>
          <Field label="Phone number" origin="From Resume">
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                queueSave({ phone: e.target.value });
              }}
              onBlur={saveNow}
              className={inputClass}
            />
          </Field>
          <Field
            label="LinkedIn URL"
            origin="From Resume"
            verified={profile.signup_provider === "linkedin_oidc" && !!linkedin}
          >
            <input
              value={linkedin}
              onChange={(e) => {
                setLinkedin(e.target.value);
                queueSave({ linkedin_url: e.target.value });
              }}
              onBlur={saveNow}
              placeholder="linkedin.com/in/..."
              className={inputClass}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Professional summary */}
      <SectionCard title="Professional summary" right={conf && <Seal label="AI confidence" confidence={conf.professional_summary} />}>
        <textarea
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            queueSave({ professional_summary: e.target.value });
          }}
          onBlur={saveNow}
          rows={4}
          className={inputClass}
        />
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => setShowRegenerate(true)}
            className="inline-flex items-center gap-1.5 text-xs text-ink hover:text-ink-light font-medium"
          >
            <Sparkles size={13} className="text-gold" /> Regenerate with AI
          </button>
          {profile.ai_snapshot?.professional_summary && <RestoreAIButton onRestore={restoreSummary} />}
        </div>
      </SectionCard>

      {/* Calculated experience */}
      <SectionCard title="Experience level">
        <span className="inline-flex items-center gap-2 rounded-full bg-paper border border-line px-4 py-2 text-sm text-ink font-mono">
          <Clock size={14} className="text-ink-soft" /> Calculated Experience: {calculatedYears ?? "—"} years
        </span>
      </SectionCard>

      {/* Work experience */}
      <SectionCard title="Work experience" right={conf && <Seal label="AI confidence" confidence={conf.experience} />}>
        <div className="space-y-4">
          {experience.map((exp, i) => (
            <div key={i} className="border border-line rounded-lg p-4 relative">
              <button
                onClick={() => updateExperience(experience.filter((_, idx) => idx !== i))}
                className="absolute top-3 right-3 text-ink-soft hover:text-alert"
              >
                <Trash2 size={14} />
              </button>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <input
                  value={exp.company}
                  onChange={(e) => {
                    const next = [...experience];
                    next[i] = { ...exp, company: e.target.value };
                    updateExperience(next);
                  }}
                  placeholder="Company"
                  className={inputClass}
                />
                <input
                  value={exp.title}
                  onChange={(e) => {
                    const next = [...experience];
                    next[i] = { ...exp, title: e.target.value };
                    updateExperience(next);
                  }}
                  placeholder="Title"
                  className={inputClass}
                />
                <input
                  value={exp.start_date}
                  onChange={(e) => {
                    const next = [...experience];
                    next[i] = { ...exp, start_date: e.target.value };
                    updateExperience(next);
                  }}
                  placeholder="MM/YYYY"
                  className={inputClass}
                />
                <input
                  value={exp.end_date}
                  onChange={(e) => {
                    const next = [...experience];
                    next[i] = { ...exp, end_date: e.target.value };
                    updateExperience(next);
                  }}
                  placeholder="MM/YYYY or Present"
                  className={inputClass}
                />
              </div>
              <textarea
                value={exp.description}
                onChange={(e) => {
                  const next = [...experience];
                  next[i] = { ...exp, description: e.target.value };
                  updateExperience(next);
                }}
                placeholder="Description"
                rows={2}
                className={`${inputClass} mb-3`}
              />
              <div>
                <label className="text-xs font-medium text-ink-soft">Key impact</label>
                <input
                  value={exp.key_impact ?? ""}
                  onChange={(e) => {
                    const next = [...experience];
                    next[i] = { ...exp, key_impact: e.target.value };
                    updateExperience(next);
                  }}
                  placeholder="Reduced onboarding time by 35%..."
                  className={`${inputClass} mt-1`}
                />
              </div>
              {/present|current/i.test(exp.end_date) && (
                <p className="text-[11px] text-verified mt-2 font-mono">
                  ✓ Mirrored to Current Company / Current Title
                </p>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            updateExperience([
              ...experience,
              { company: "", title: "", start_date: "", end_date: "Present", description: "" },
            ])
          }
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink hover:text-ink-light"
        >
          <Plus size={14} /> Add experience
        </button>
      </SectionCard>

      {/* Education */}
      <SectionCard title="Education" right={conf && <Seal label="AI confidence" confidence={conf.education} />}>
        <div className="space-y-3">
          {education.map((ed, i) => (
            <div key={i} className="border border-line rounded-lg p-4 relative grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => updateEducation(education.filter((_, idx) => idx !== i))}
                className="absolute top-3 right-3 text-ink-soft hover:text-alert"
              >
                <Trash2 size={14} />
              </button>
              <input
                value={ed.degree}
                onChange={(e) => {
                  const next = [...education];
                  next[i] = { ...ed, degree: e.target.value };
                  updateEducation(next);
                }}
                placeholder="Degree"
                className={inputClass}
              />
              <input
                value={ed.institution}
                onChange={(e) => {
                  const next = [...education];
                  next[i] = { ...ed, institution: e.target.value };
                  updateEducation(next);
                }}
                placeholder="Institution"
                className={inputClass}
              />
              <input
                value={ed.field_of_study}
                onChange={(e) => {
                  const next = [...education];
                  next[i] = { ...ed, field_of_study: e.target.value };
                  updateEducation(next);
                }}
                placeholder="Field of study"
                className={inputClass}
              />
              <input
                value={ed.graduation_year}
                onChange={(e) => {
                  const next = [...education];
                  next[i] = { ...ed, graduation_year: e.target.value };
                  updateEducation(next);
                }}
                placeholder="Graduation year"
                className={inputClass}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            updateEducation([...education, { degree: "", institution: "", field_of_study: "", graduation_year: "" }])
          }
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink hover:text-ink-light"
        >
          <Plus size={14} /> Add education
        </button>
      </SectionCard>

      {/* Skills */}
      <SectionCard title="Skills" right={conf && <Seal label="AI match confidence" confidence={conf.skills} />}>
        <p className="text-xs text-ink-soft mb-3">Pin your top 3–5 skills — these show first to employers.</p>
        <div className="space-y-2 mb-4">
          {skills.map((s) => (
            <div key={s.name} className="flex flex-wrap items-center gap-3 border border-line rounded-lg px-3 py-2">
              <button onClick={() => togglePrimary(s.name)} className="shrink-0">
                {s.primary ? <Pin size={14} className="text-gold fill-gold" /> : <PinOff size={14} className="text-line" />}
              </button>
              <span className="text-sm text-ink font-medium min-w-[100px]">{s.name}</span>
              <span className="text-[11px] font-mono text-ink-soft bg-paper rounded-full px-2 py-0.5">{s.category}</span>
              <StarRating
                value={s.proficiency}
                onChange={(v) => updateSkills(skills.map((sk) => (sk.name === s.name ? { ...sk, proficiency: v } : sk)))}
              />
              <select
                value={s.last_used}
                onChange={(e) =>
                  updateSkills(skills.map((sk) => (sk.name === s.name ? { ...sk, last_used: e.target.value } : sk)))
                }
                className="text-xs rounded-md border border-line px-2 py-1 ml-auto bg-white"
              >
                <option value="Current">Current</option>
                {Array.from({ length: 10 }).map((_, idx) => {
                  const y = CURRENT_YEAR - idx;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
              <button
                onClick={() => updateSkills(skills.filter((sk) => sk.name !== s.name))}
                className="text-ink-soft hover:text-alert"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Add a skill"
            className={`${inputClass} flex-1 min-w-[140px]`}
          />
          <select
            value={newSkillCategory}
            onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
            className="rounded-lg border border-line px-2 py-2 text-sm bg-white"
          >
            {SKILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              if (!newSkillName.trim()) return;
              updateSkills([
                ...skills,
                { name: newSkillName.trim(), category: newSkillCategory, proficiency: 3, last_used: "Current", primary: false },
              ]);
              setNewSkillName("");
            }}
          >
            <Plus size={14} /> Add
          </Button>
        </div>
      </SectionCard>

      {/* Certifications */}
      <SectionCard
        title="Certifications"
        right={
          conf && (
            <Seal label={conf.certifications < 80 ? "Review recommended" : "AI confidence"} confidence={conf.certifications} />
          )
        }
      >
        <div className="space-y-3">
          {certifications.map((c, i) => (
            <div key={i} className="border border-line rounded-lg p-4 relative grid sm:grid-cols-3 gap-3">
              <button
                onClick={() => updateCertifications(certifications.filter((_, idx) => idx !== i))}
                className="absolute top-3 right-3 text-ink-soft hover:text-alert"
              >
                <Trash2 size={14} />
              </button>
              <input
                value={c.name}
                onChange={(e) => {
                  const next = [...certifications];
                  next[i] = { ...c, name: e.target.value };
                  updateCertifications(next);
                }}
                placeholder="Certification name"
                className={inputClass}
              />
              <input
                value={c.provider}
                onChange={(e) => {
                  const next = [...certifications];
                  next[i] = { ...c, provider: e.target.value };
                  updateCertifications(next);
                }}
                placeholder="Provider"
                className={inputClass}
              />
              <input
                value={c.credential_id ?? ""}
                onChange={(e) => {
                  const next = [...certifications];
                  next[i] = { ...c, credential_id: e.target.value };
                  updateCertifications(next);
                }}
                placeholder="Credential ID (optional)"
                className={inputClass}
              />
              <span className="sm:col-span-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] font-mono flex items-center gap-3">
                  {c.credential_id ? (
                    <span className="text-verified">✓ Verified</span>
                  ) : (
                    <span className="text-gold">⏳ Uploaded — pending verification</span>
                  )}
                  {c.certificate_url && (
                    <a href={c.certificate_url} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
                      View file
                    </a>
                  )}
                </span>
                <label className="inline-flex items-center gap-1.5 text-xs text-ink cursor-pointer hover:text-ink-light">
                  {uploadingCertIdx === i ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  {c.certificate_url ? "Replace certificate" : "Upload certificate"}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCertificate(i, file);
                    }}
                  />
                </label>
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            updateCertifications([...certifications, { name: "", provider: "", credential_id: null }])
          }
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink hover:text-ink-light"
        >
          <Plus size={14} /> Add certification
        </button>
      </SectionCard>
    </div>
  );
}
