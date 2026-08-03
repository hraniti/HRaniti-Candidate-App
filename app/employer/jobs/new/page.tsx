"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import EmployerShell from "@/components/employer/EmployerShell";
import Field from "@/components/employer/Field";
import Chip from "@/components/employer/Chip";
import EmployerInputStyles from "@/components/employer/EmployerInputStyles";
import { CAREER_TRACKS } from "@/lib/types";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

const EXPERIENCE_BRACKETS = [
  { label: "0–4 yrs", minYears: 1 },
  { label: "4.1–8 yrs", minYears: 5 },
  { label: "8.1–12 yrs", minYears: 9 },
  { label: "12.1+ yrs", minYears: 13 },
];

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<{ slug: string } | null>(null);
  const [quota, setQuota] = useState<{ plan: string; activeCount: number } | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data: company } = await supabase.from("companies").select("plan").eq("id", companyId).single();
      const { count } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active");
      setQuota({ plan: company?.plan ?? "Free", activeCount: count ?? 0 });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [title, setTitle] = useState("");
  const [careerTrack, setCareerTrack] = useState("");
  const [experienceBracket, setExperienceBracket] = useState(EXPERIENCE_BRACKETS[0].label);
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState<"Remote" | "Hybrid" | "On-site">("On-site");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [employmentType, setEmploymentType] = useState<"Full-time" | "Contract" | "Freelance">(
    "Full-time"
  );
  const [skillsInput, setSkillsInput] = useState("");
  const [niceToHaveInput, setNiceToHaveInput] = useState("");
  const [description, setDescription] = useState("");
  const [targetStartDate, setTargetStartDate] = useState("");
  const [whyJoinUs, setWhyJoinUs] = useState("");

  const canSubmit =
    title.trim().length > 1 &&
    careerTrack &&
    location.trim().length > 1 &&
    salaryMin &&
    salaryMax &&
    skillsInput.trim().length > 0 &&
    description.trim().length > 0;

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in.");
      setSaving(false);
      return;
    }

    const companyId = await getOrCreateCompanyId(supabase, user);

    const { data: company } = await supabase
      .from("companies")
      .select("name, tagline, plan")
      .eq("id", companyId)
      .single();

    // Free plan: up to 2 active jobs, per the spec's Section A limits.
    const plan = company?.plan ?? "Free";
    if (plan === "Free") {
      const { count: activeCount } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active");
      if ((activeCount ?? 0) >= 2) {
        setError(
          "You've reached the Free plan limit of 2 active jobs. Close an existing job or upgrade to post more."
        );
        setSaving(false);
        return;
      }
    }

    const bracket = EXPERIENCE_BRACKETS.find((b) => b.label === experienceBracket)!;
    const skills = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
    const niceToHave = niceToHaveInput.split(",").map((s) => s.trim()).filter(Boolean);
    const slug = slugify(title);

    const { error } = await supabase.from("jobs").insert({
      company_id: companyId,
      posted_by: user.id,
      title,
      company: company?.name ?? "Your Company",
      location,
      career_track: careerTrack,
      work_mode: workMode,
      employment_type: employmentType,
      salary_min: Number(salaryMin),
      salary_max: Number(salaryMax),
      salary_currency: currency,
      min_experience_years: bracket.minYears,
      skills,
      required_skills: skills,
      preferred_skills: [],
      nice_to_have_skills: niceToHave,
      description,
      why_join_us: whyJoinUs || null,
      target_start_date: targetStartDate || null,
      status: "active",
      public_slug: slug,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPosted({ slug });
  }

  if (posted) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <span className="inline-flex items-center gap-2 mb-8"><img src="/brand/logo-icon.png" alt="" className="h-5 w-auto" /><span className="font-display italic text-lg text-ink">HRaniti</span></span>
          <p className="text-sm text-ink-soft mb-2">Public job link generated</p>
          <div className="font-mono text-sm px-4 py-2 rounded-lg inline-block mb-8 bg-paper-deep text-ink">
            hraniti.com/jobs/{posted.slug}
          </div>
          <h2 className="font-display text-2xl text-ink mb-2">Your job is live</h2>
          <p className="text-sm text-ink-soft mb-8">
            We're running an instant match against the Central Talent Pool now.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={() => router.push("/employer/jobs")}>
              View all jobs
            </Button>
            <Button onClick={() => router.push(`/employer/shortlist?job=${posted.slug}`)}>
              View shortlist
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <EmployerShell>
      <div className="px-6 sm:px-10 py-8 sm:py-10 max-w-3xl">
        <h1 className="font-display text-2xl text-ink mb-1">Post a job</h1>
        <p className="text-sm text-ink-soft mb-6">
          Manual entry — free. AI parsing and PDF upload come next.
        </p>

        {quota && quota.plan === "Free" && (
          <div
            className={`rounded-lg px-4 py-3 mb-6 text-sm ${
              quota.activeCount >= 2
                ? "bg-brandCoral-soft text-brandCoral"
                : "bg-paper-deep text-ink-soft"
            }`}
          >
            {quota.activeCount >= 2
              ? "You've used both active jobs on the Free plan. Close an existing job or upgrade to post another."
              : `${quota.activeCount} of 2 active jobs used on the Free plan.`}
          </div>
        )}

        <div className="paper-card p-6 sm:p-7 space-y-4">
          <Field label="Job Title" required>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Career Track" required>
              <select className="input" value={careerTrack} onChange={(e) => setCareerTrack(e.target.value)}>
                <option value="">Select…</option>
                {CAREER_TRACKS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Experience Bracket" required>
              <select className="input" value={experienceBracket} onChange={(e) => setExperienceBracket(e.target.value)}>
                {EXPERIENCE_BRACKETS.map((b) => (
                  <option key={b.label}>{b.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" required hint='City, Country or "Remote"'>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label="Work Mode" required>
              <select className="input" value={workMode} onChange={(e) => setWorkMode(e.target.value as any)}>
                <option>On-site</option>
                <option>Hybrid</option>
                <option>Remote</option>
              </select>
            </Field>
          </div>

          <Field label="Employment Type" required>
            <div className="flex flex-wrap gap-2">
              {(["Full-time", "Contract", "Freelance"] as const).map((t) => (
                <Chip key={t} label={t} active={employmentType === t} onClick={() => setEmploymentType(t)} />
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Salary Min" required>
              <input className="input" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
            </Field>
            <Field label="Salary Max" required>
              <input className="input" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
            </Field>
            <Field label="Currency" required>
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
                <option>AED</option>
              </select>
            </Field>
          </div>

          <Field label="Skills" required hint="Comma-separated (e.g. React, Node.js, AWS)">
            <input className="input" value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} />
          </Field>
          <Field label="Nice-to-Have Skills" hint="Optional, comma-separated">
            <input className="input" value={niceToHaveInput} onChange={(e) => setNiceToHaveInput(e.target.value)} />
          </Field>

          <Field label="Job Description" required hint="100–500 words">
            <textarea className="input min-h-[110px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Target Start Date" hint="Optional">
              <input className="input" type="date" value={targetStartDate} onChange={(e) => setTargetStartDate(e.target.value)} />
            </Field>
            <Field label="Why Join Us?" hint="Optional — otherwise pulls from company profile">
              <input className="input" value={whyJoinUs} onChange={(e) => setWhyJoinUs(e.target.value)} />
            </Field>
          </div>

          {error && <p className="text-sm text-alert">{error}</p>}

          <Button className="w-full justify-center mt-2" disabled={!canSubmit || (quota?.plan === "Free" && quota.activeCount >= 2)} loading={saving} onClick={handleSubmit}>
            Post job &amp; run instant match
          </Button>
        </div>
      </div>
      <EmployerInputStyles />
    </EmployerShell>
  );
}
