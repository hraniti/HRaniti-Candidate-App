"use client";

import { useEffect, useState } from "react";
import EmployerShell from "@/components/employer/EmployerShell";
import JobEditor from "@/components/employer/JobEditor";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

function parseDescription(raw: string) {
  try { const parsed = JSON.parse(raw); if (parsed && typeof parsed === "object") return parsed; } catch {}
  return {};
}

export default function EditJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [values, setValues] = useState<any>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMissing(true); return; }
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data: job } = await supabase.from("jobs").select("*").eq("id", params.id).eq("company_id", companyId).single();
      if (!job) { setMissing(true); return; }
      const parsed = parseDescription(job.description ?? "");
      const requirements = parsed.requirements ?? {};
      const process = parsed.process ?? {};
      const compensation = parsed.compensation ?? {};
      const locationParts = String(job.location ?? "").split(",").map((part: string) => part.trim()).filter(Boolean);
      const city = requirements.city ?? locationParts[0] ?? "";
      const state = requirements.state ?? locationParts[1] ?? "";
      const country = requirements.country ?? locationParts[2] ?? "";
      setValues({
        title: job.title ?? "",
        department: requirements.department ?? "",
        openings: String(requirements.openings ?? 1),
        careerTrack: job.career_track ?? "",
        experienceMin: job.min_experience_years ? String(job.min_experience_years) : "",
        experienceMax: requirements.experienceMax ?? "",
        experienceLevel: requirements.experienceLevel ?? "",
        city,
        state,
        country,
        workMode: job.work_mode ?? "On-site",
        employmentType: job.employment_type ?? "Full-time",
        requiredSkills: job.required_skills ?? [],
        preferredSkills: job.preferred_skills ?? [],
        education: requirements.education ?? "",
        educationRequired: requirements.educationRequired ?? "Not specified",
        certifications: requirements.certifications ?? [],
        languages: requirements.languages ?? [],
        workAuthorization: requirements.workAuthorization ?? "",
        relocation: requirements.relocation ?? "Open to discussion",
        roleIntro: parsed.intro ?? job.why_join_us ?? "",
        description: parsed.description ?? job.description ?? "",
        responsibilities: parsed.responsibilities ?? "",
        benefits: job.perks ?? [],
        recruiterId: process.recruiterId ?? "",
        recruiterName: process.recruiterName ?? "",
        recruiterEmail: process.recruiterEmail ?? "",
        hiringManagerId: process.hiringManagerId ?? "",
        hiringManager: process.hiringManager ?? "",
        hiringManagerEmail: process.hiringManagerEmail ?? "",
        pipeline: process.pipeline ?? "Standard",
        interviewRounds: process.interviewRounds ?? "2",
        interviewDuration: process.interviewDuration ?? "60",
        assessment: process.assessment ?? "None",
        screeningQuestions: process.screeningQuestions ?? [],
        approvalRequired: Boolean(process.approvalRequired),
        salaryMin: job.salary_min == null ? "" : String(job.salary_min),
        salaryMax: job.salary_max == null ? "" : String(job.salary_max),
        currency: job.salary_currency ?? "INR",
        salaryVisibility: compensation.salaryVisibility ?? "Show salary",
        deadline: compensation.deadline ?? "",
        visibility: compensation.visibility ?? "Public",
        allowLateApplications: compensation.allowLateApplications !== false,
      });
    })();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) return <EmployerShell><div className="px-6 py-16 text-center text-sm text-[#71859A]">This job could not be found.</div></EmployerShell>;
  if (!values) return <EmployerShell><div className="px-6 py-16 text-center text-sm text-[#71859A]">Loading job…</div></EmployerShell>;

  return <EmployerShell><JobEditor jobId={params.id} initialValues={values} mode="edit" /></EmployerShell>;
}
