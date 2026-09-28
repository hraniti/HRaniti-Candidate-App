"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Field from "@/components/employer/Field";
import { CAREER_TRACKS } from "@/lib/types";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";\nimport EmployerInputStyles from "@/components/employer/EmployerInputStyles";

type JobFormValues = {
  title: string;
  department: string;
  openings: string;
  careerTrack: string;
  experienceMin: string;
  experienceMax: string;
  experienceLevel: string;
  location: string;
  locations: string[];
  workMode: "On-site" | "Hybrid" | "Remote";
  employmentType: "Full-time" | "Contract" | "Freelance";
  requiredSkills: string[];
  preferredSkills: string[];
  education: string;
  educationRequired: "Required" | "Preferred" | "Not specified";
  certifications: string[];
  languages: string[];
  workAuthorization: string;
  relocation: "Yes" | "No" | "Open to discussion";
  roleIntro: string;
  description: string;
  responsibilities: string;
  benefits: string[];
  recruiterName: string;
  hiringManager: string;
  pipeline: string;
  interviewRounds: string;
  interviewDuration: string;
  assessment: string;
  screeningQuestions: string[];
  approvalRequired: boolean;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  salaryVisibility: "Show salary" | "Hide salary";
  deadline: string;
  visibility: "Public" | "Private" | "Invite only";
  allowLateApplications: boolean;
};

const emptyForm: JobFormValues = {
  title: "",
  department: "",
  openings: "1",
  careerTrack: "",
  experienceMin: "",
  experienceMax: "",
  experienceLevel: "",
  location: "",
  locations: [],
  workMode: "On-site",
  employmentType: "Full-time",
  requiredSkills: [],
  preferredSkills: [],
  education: "",
  educationRequired: "Not specified",
  certifications: [],
  languages: [],
  workAuthorization: "",
  relocation: "Open to discussion",
  roleIntro: "",
  description: "",
  responsibilities: "",
  benefits: [],
  recruiterName: "",
  hiringManager: "",
  pipeline: "Standard",
  interviewRounds: "2",
  interviewDuration: "60",
  assessment: "None",
  screeningQuestions: [],
  approvalRequired: false,
  salaryMin: "",
  salaryMax: "",
  currency: "INR",
  salaryVisibility: "Show salary",
  deadline: "",
  visibility: "Public",
  allowLateApplications: true,
};

const steps = [
  { title: "Role", subtitle: "The essentials" },
  { title: "Requirements", subtitle: "Who you're looking for" },
  { title: "Description", subtitle: "What they'll do" },
  { title: "Hiring Process", subtitle: "How you'll hire" },
  { title: "Compensation & Visibility", subtitle: "What you're offering" },
];

function toList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function addUnique(list: string[], value: string) {
  const clean = value.trim();
  if (!clean || list.some((item) => item.toLowerCase() === clean.toLowerCase())) return list;
  return [...list, clean];
}

function slugify(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base || "job"}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseStoredDescription(description: string) {
  try {
    const parsed = JSON.parse(description);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}
  return null;
}

export default function JobEditor({
  jobId,
  initialValues,
  mode = "create",
}: {
  jobId?: string;
  initialValues?: Partial<JobFormValues>;
  mode?: "create" | "edit";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState<JobFormValues>({ ...emptyForm, ...initialValues });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({ ...emptyForm, ...initialValues });
  }, [initialValues]);

  function update<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addFromInput(key: keyof JobFormValues) {
    const value = inputValues[key as string] ?? "";
    const current = form[key];
    if (!Array.isArray(current)) return;
    update(key, addUnique(current as string[], value) as JobFormValues[typeof key]);
    setInputValues((current) => ({ ...current, [key as string]: "" }));
  }

  function removeFromList(key: keyof JobFormValues, value: string) {
    const current = form[key];
    if (!Array.isArray(current)) return;
    update(key, (current as string[]).filter((item) => item !== value) as JobFormValues[typeof key]);
  }

  function stepValid(index: number) {
    if (index === 0) {
      return Boolean(form.title.trim() && form.department.trim() && form.careerTrack && form.location.trim() && form.openings);
    }
    if (index === 1) {
      return form.requiredSkills.length > 0 && Boolean(form.experienceMin || form.experienceMax || form.experienceLevel);
    }
    if (index === 2) {
      return Boolean(form.description.trim() && form.responsibilities.trim());
    }
    return true;
  }

  function canPublish() {
    return steps.every((_, index) => stepValid(index));
  }

  async function save(status: "draft" | "publish") {
    setSaving(status);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");

      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data: company } = await supabase.from("companies").select("name,description,industry,size,website,benefits").eq("id", companyId).single();

      const salaryMin = form.salaryMin ? Number(form.salaryMin) : null;
      const salaryMax = form.salaryMax ? Number(form.salaryMax) : null;
      if (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin) {
        throw new Error("Maximum salary should be greater than or equal to minimum salary.");
      }

      const descriptionPayload = JSON.stringify({
        intro: form.roleIntro,
        description: form.description,
        responsibilities: form.responsibilities,
        requirements: {
          department: form.department,
          openings: Number(form.openings || 1),
          experienceMax: form.experienceMax,
          experienceLevel: form.experienceLevel,
          education: form.education,
          educationRequired: form.educationRequired,
          certifications: form.certifications,
          languages: form.languages,
          workAuthorization: form.workAuthorization,
          relocation: form.relocation,
        },
        process: {
          recruiterName: form.recruiterName,
          hiringManager: form.hiringManager,
          pipeline: form.pipeline,
          interviewRounds: form.interviewRounds,
          interviewDuration: form.interviewDuration,
          assessment: form.assessment,
          screeningQuestions: form.screeningQuestions,
          approvalRequired: form.approvalRequired,
        },
        compensation: {
          salaryMin,
          salaryMax,
          currency: form.currency,
          salaryVisibility: form.salaryVisibility,
          deadline: form.deadline,
          visibility: form.visibility,
          allowLateApplications: form.allowLateApplications,
        },
      });

      const payload = {
        openings: Number(form.openings || 1),
        title: form.title.trim(),
        company: company?.name ?? "Your Company",
        company_id: companyId,
        posted_by: user.id,
        location: form.location.trim(),
        locations: [form.location.trim(), ...form.locations.filter((item) => item !== form.location.trim())],
        career_track: form.careerTrack,
        skills: form.requiredSkills,
        required_skills: form.requiredSkills,
        preferred_skills: form.preferredSkills,
        nice_to_have_skills: form.preferredSkills,
        applicant_count: 0,
        employment_type: form.employmentType,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: form.currency,
        work_mode: form.workMode,
        min_experience_years: Number(form.experienceMin || 0),
        target_start_date: null,
        why_join_us: form.roleIntro || null,
        description: descriptionPayload,
        company_description: company?.description ?? "",
        industry: company?.industry ?? "",
        company_size: company?.size ?? "",
        website: company?.website ?? "",
        perks: form.benefits,
        hiring_team: [
          ...(form.recruiterName ? [{ name: form.recruiterName, role: "Recruiter" }] : []),
          ...(form.hiringManager ? [{ name: form.hiringManager, role: "Hiring Manager" }] : []),
        ],
        notice_period_required: null,
        status: status === "publish" ? "active" : "draft",
        public_slug: mode === "edit" ? undefined : slugify(form.title),
      };

      let result;
      if (mode === "edit" && jobId) {
        const { public_slug: _publicSlug, ...updatePayload } = payload;
        result = await supabase.from("jobs").update(updatePayload).eq("id", jobId).select("id").single();
      } else {
        result = await supabase.from("jobs").insert(payload).select("id").single();
      }

      if (result.error) throw result.error;

      router.push(mode === "edit" && jobId ? `/employer/jobs/${jobId}` : "/employer/jobs");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  function renderChips(key: "requiredSkills" | "preferredSkills" | "certifications" | "languages" | "benefits" | "screeningQuestions", placeholder: string) {
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {form[key].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF4F2] px-3 py-1.5 text-[12px] text-[#176E68]">
              {item}
              <button type="button" onClick={() => removeFromList(key, item)} className="hover:text-[#173454]" aria-label={`Remove ${item}`}><X size={13} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-[#DDE5EA] bg-white px-4 py-3 text-[13px] text-[#173454] outline-none focus:border-[#7DB9B1] focus:ring-2 focus:ring-[#E7F3F1]"
            value={inputValues[key] ?? ""}
            onChange={(e) => setInputValues((current) => ({ ...current, [key]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFromInput(key); } }}
            placeholder={placeholder}
          />
          <button type="button" onClick={() => addFromInput(key)} className="w-11 rounded-xl border border-[#DDE5EA] bg-white text-[#167D73] flex items-center justify-center hover:bg-[#F4F8F7]" aria-label="Add"><Plus size={17} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#FCFCFA]">
      <div className="mx-auto max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10">
        <button type="button" onClick={() => router.push("/employer/jobs")} className="inline-flex items-center gap-2 text-[13px] text-[#71859A] hover:text-[#173454] mb-5">
          <ArrowLeft size={15} /> Back to Jobs
        </button>

        <div className="flex flex-col gap-2 mb-8">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#167D73] uppercase">HIRING</p>
          <h1 className="font-display text-3xl sm:text-[34px] text-[#173454]">{mode === "edit" ? "Edit job" : "Post a job"}</h1>
          <p className="text-sm text-[#71859A] max-w-2xl">{mode === "edit" ? "Update the role without losing the hiring context." : "Create a clear, focused job opening in a few simple steps."}</p>
        </div>

        <div className="mb-8 overflow-x-auto pb-1">
          <div className="min-w-[760px] flex items-start">
            {steps.map((item, index) => (
              <button key={item.title} type="button" onClick={() => index <= step || stepValid(step) ? setStep(index) : undefined} className="flex-1 text-left group">
                <div className="flex items-center">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium ${index === step ? "border-[#167D73] bg-[#167D73] text-white" : index < step ? "border-[#B9DDD7] bg-[#E7F3F1] text-[#167D73]" : "border-[#DDE5EA] bg-white text-[#8A99A5]"}`}>
                    {index < step ? <Check size={15} /> : index + 1}
                  </span>
                  {index < steps.length - 1 && <span className={`mx-3 h-px flex-1 ${index < step ? "bg-[#B9DDD7]" : "bg-[#DDE5EA]"}`} />}
                </div>
                <span className={`mt-2 block text-[12px] font-medium ${index === step ? "text-[#173454]" : "text-[#71859A]"}`}>{item.title}</span>
                <span className="block mt-0.5 text-[10px] text-[#9AA8B3]">{item.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <section className="rounded-2xl border border-[#DDE5EA] bg-white p-6 sm:p-8 shadow-[0_2px_12px_rgba(23,52,84,0.025)]">
            {step === 0 && (
              <div className="space-y-5">
                <div><h2 className="text-lg font-semibold text-[#173454]">Role</h2><p className="mt-1 text-sm text-[#71859A]">The essentials candidates need first.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Job Title" required><input className="input" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Senior SAP ABAP Consultant" /></Field>
                  <Field label="Department" required><input className="input" value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Technology" /></Field>
                  <Field label="Career Area" required><select className="input" value={form.careerTrack} onChange={(e) => update("careerTrack", e.target.value)}><option value="">Select</option>{CAREER_TRACKS.map((item) => <option key={item}>{item}</option>)}</select></Field>
                  <Field label="Number of openings" required><input className="input" type="number" min="1" value={form.openings} onChange={(e) => update("openings", e.target.value)} /></Field>
                  <Field label="Location" required><input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Mumbai, India" /></Field>
                  <Field label="Work arrangement" required><select className="input" value={form.workMode} onChange={(e) => update("workMode", e.target.value as JobFormValues["workMode"])}><option>On-site</option><option>Hybrid</option><option>Remote</option></select></Field>
                  <Field label="Employment type" required><select className="input" value={form.employmentType} onChange={(e) => update("employmentType", e.target.value as JobFormValues["employmentType"])}><option>Full-time</option><option>Contract</option><option>Freelance</option></select></Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div><h2 className="text-lg font-semibold text-[#173454]">Requirements</h2><p className="mt-1 text-sm text-[#71859A]">Keep the essentials clear. Avoid turning the job into a checklist.</p></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Minimum experience"><input className="input" type="number" min="0" value={form.experienceMin} onChange={(e) => update("experienceMin", e.target.value)} placeholder="5" /></Field>
                  <Field label="Maximum experience"><input className="input" type="number" min="0" value={form.experienceMax} onChange={(e) => update("experienceMax", e.target.value)} placeholder="10" /></Field>
                  <Field label="Experience level"><select className="input" value={form.experienceLevel} onChange={(e) => update("experienceLevel", e.target.value)}><option value="">Select</option><option>Entry</option><option>Mid</option><option>Senior</option><option>Lead</option></select></Field>
                </div>
                <Field label="Required skills" required>{renderChips("requiredSkills", "Add a skill and press Enter")}</Field>
                <Field label="Preferred skills">{renderChips("preferredSkills", "Optional skills")}</Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Education"><input className="input" value={form.education} onChange={(e) => update("education", e.target.value)} placeholder="Bachelor's in Computer Science" /></Field>
                  <Field label="Education preference"><select className="input" value={form.educationRequired} onChange={(e) => update("educationRequired", e.target.value as JobFormValues["educationRequired"])}><option>Not specified</option><option>Required</option><option>Preferred</option></select></Field>
                </div>
                <Field label="Certifications">{renderChips("certifications", "Add certification")}</Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Languages">{renderChips("languages", "Add language")}</Field>
                  <Field label="Work authorization"><input className="input" value={form.workAuthorization} onChange={(e) => update("workAuthorization", e.target.value)} placeholder="e.g. Must be eligible to work in India" /></Field>
                </div>
                <Field label="Relocation"><select className="input" value={form.relocation} onChange={(e) => update("relocation", e.target.value as JobFormValues["relocation"])}><option>Open to discussion</option><option>Yes</option><option>No</option></select></Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div><h2 className="text-lg font-semibold text-[#173454]">Description</h2><p className="mt-1 text-sm text-[#71859A]">Tell people what the role is, what they will do, and why it matters.</p></div>
                <Field label="About the role"><textarea className="input min-h-[100px]" value={form.roleIntro} onChange={(e) => update("roleIntro", e.target.value)} placeholder="A short introduction to the opportunity." /></Field>
                <Field label="Job description" required><textarea className="input min-h-[180px]" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the role in clear, candidate-friendly language." /></Field>
                <Field label="Responsibilities" required><textarea className="input min-h-[160px]" value={form.responsibilities} onChange={(e) => update("responsibilities", e.target.value)} placeholder="List the main responsibilities, one per line." /></Field>
                <Field label="Benefits"><div className="space-y-2">{renderChips("benefits", "Add a benefit")}</div></Field>
                <div className="rounded-xl bg-[#F4F8F7] border border-[#E2EEEC] px-4 py-3 text-[12px] text-[#5F7483]">Company information will come from the employer profile, so you don't need to type it again.</div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div><h2 className="text-lg font-semibold text-[#173454]">Hiring Process</h2><p className="mt-1 text-sm text-[#71859A]">Set the process once. Candidate progress is managed in Applicants.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Recruiter"><input className="input" value={form.recruiterName} onChange={(e) => update("recruiterName", e.target.value)} placeholder="Name" /></Field>
                  <Field label="Hiring manager"><input className="input" value={form.hiringManager} onChange={(e) => update("hiringManager", e.target.value)} placeholder="Name" /></Field>
                  <Field label="Hiring pipeline"><select className="input" value={form.pipeline} onChange={(e) => update("pipeline", e.target.value)}><option>Standard</option><option>Technical hiring</option><option>Leadership</option><option>Custom</option></select></Field>
                  <Field label="Interview rounds"><select className="input" value={form.interviewRounds} onChange={(e) => update("interviewRounds", e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option></select></Field>
                  <Field label="Interview duration"><select className="input" value={form.interviewDuration} onChange={(e) => update("interviewDuration", e.target.value)}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></Field>
                  <Field label="Assessment"><select className="input" value={form.assessment} onChange={(e) => update("assessment", e.target.value)}><option>None</option><option>Technical assessment</option><option>Custom assessment</option></select></Field>
                </div>
                <Field label="Screening questions">{renderChips("screeningQuestions", "Add a question")}</Field>
                <label className="flex items-start gap-3 rounded-xl border border-[#DDE5EA] p-4 cursor-pointer hover:bg-[#FAFCFB]"><input type="checkbox" className="mt-0.5 accent-[#167D73]" checked={form.approvalRequired} onChange={(e) => update("approvalRequired", e.target.checked)} /><span><span className="block text-sm font-medium text-[#173454]">Approval required before publishing</span><span className="block mt-1 text-xs text-[#71859A]">Use this when another team member needs to review the role first.</span></span></label>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div><h2 className="text-lg font-semibold text-[#173454]">Compensation & Visibility</h2><p className="mt-1 text-sm text-[#71859A]">Be transparent where you can, and choose who should see the role.</p></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Minimum salary"><input className="input" type="number" min="0" value={form.salaryMin} onChange={(e) => update("salaryMin", e.target.value)} placeholder="1200000" /></Field>
                  <Field label="Maximum salary"><input className="input" type="number" min="0" value={form.salaryMax} onChange={(e) => update("salaryMax", e.target.value)} placeholder="1800000" /></Field>
                  <Field label="Currency"><select className="input" value={form.currency} onChange={(e) => update("currency", e.target.value)}><option>INR</option><option>USD</option><option>EUR</option><option>AED</option><option>GBP</option></select></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Salary visibility"><select className="input" value={form.salaryVisibility} onChange={(e) => update("salaryVisibility", e.target.value as JobFormValues["salaryVisibility"])}><option>Show salary</option><option>Hide salary</option></select></Field>
                  <Field label="Application deadline"><input className="input" type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} /></Field>
                  <Field label="Job visibility"><select className="input" value={form.visibility} onChange={(e) => update("visibility", e.target.value as JobFormValues["visibility"])}><option>Public</option><option>Private</option><option>Invite only</option></select></Field>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-[#DDE5EA] p-4 cursor-pointer hover:bg-[#FAFCFB]"><input type="checkbox" className="mt-0.5 accent-[#167D73]" checked={form.allowLateApplications} onChange={(e) => update("allowLateApplications", e.target.checked)} /><span><span className="block text-sm font-medium text-[#173454]">Keep applications open after the deadline</span><span className="block mt-1 text-xs text-[#71859A]">You can close the job manually whenever you're ready.</span></span></label>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-[#EEF2F4] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button variant="ghost" type="button" onClick={() => step > 0 ? setStep(step - 1) : router.push("/employer/jobs")}> {step === 0 ? "Cancel" : "Back"} </Button>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="secondary" type="button" loading={saving === "draft"} disabled={Boolean(saving)} onClick={() => save("draft")}>Save draft</Button>
                {step < steps.length - 1 ? (
                  <Button type="button" disabled={!stepValid(step)} onClick={() => setStep(step + 1)}>Next: {steps[step + 1].title} <ArrowRight size={15} /></Button>
                ) : (
                  <Button type="button" disabled={!canPublish()} loading={saving === "publish"} onClick={() => save("publish")}><Check size={15} /> Publish job</Button>
                )}
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-[#B34E3E]">{error}</p>}
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-[96px] rounded-2xl border border-[#DDE5EA] bg-white p-5">
              <div className="flex items-center gap-2 text-[#173454]"><CircleHelp size={16} className="text-[#167D73]" /><p className="text-sm font-semibold">A calmer job post</p></div>
              <p className="mt-2 text-xs leading-5 text-[#71859A]">Keep the role specific, readable and honest. You can edit everything after saving.</p>
              <div className="mt-5 space-y-3">
                {steps.map((item, index) => <button key={item.title} type="button" onClick={() => (index <= step || stepValid(step)) && setStep(index)} className={`w-full text-left rounded-xl px-3 py-2.5 transition ${index === step ? "bg-[#E7F3F1]" : "hover:bg-[#F6F9F8]"}`}><span className={`text-xs font-medium ${index === step ? "text-[#167D73]" : "text-[#526A7D]"}`}>{index + 1}. {item.title}</span></button>)}
              </div>
              <div className="mt-5 pt-4 border-t border-[#EEF2F4] text-[11px] leading-5 text-[#8A99A5]">Required fields are marked with *. Drafts stay private until you publish.</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
