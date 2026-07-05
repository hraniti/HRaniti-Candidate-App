import { Profile, Job } from "./types";

export type MatchTier = "Excellent Match" | "Good Match" | "Possible Match";

function skillOverlap(profileSkills: string[], jobSkills: string[]): number {
  if (jobSkills.length === 0) return 0;
  const set = new Set(profileSkills.map((s) => s.toLowerCase()));
  const matched = jobSkills.filter((s) => set.has(s.toLowerCase())).length;
  return matched / jobSkills.length;
}

/**
 * Deterministic match score, 0-100. This is what actually ranks the "For You"
 * feed — no AI call involved. Weighted evenly across the four things the
 * "Why This Job?" checklist shows: skills, experience/track, location, work mode.
 */
export function calcMatchScore(profile: Profile, job: Job): number {
  const skills = profile.skills ?? [];
  const requiredAndPreferred = [...(job.required_skills ?? []), ...(job.preferred_skills ?? [])];
  const skillsScore = skillOverlap(skills, requiredAndPreferred) * 40;

  const trackScore = profile.career_track === job.career_track ? 20 : 0;

  const candidateLocations = [profile.current_location, profile.city, ...(profile.preferred_locations ?? [])]
    .filter(Boolean)
    .map((l) => (l as string).toLowerCase());
  const jobLocations = [job.location, ...(job.locations ?? [])].map((l) => l.toLowerCase());
  const locationScore =
    job.work_mode === "Remote" || candidateLocations.some((l) => jobLocations.some((jl) => jl.includes(l) || l.includes(jl)))
      ? 20
      : 0;

  const workModeScore = (profile.work_preference ?? []).includes(job.work_mode) ? 20 : 10;

  return Math.round(Math.min(100, skillsScore + trackScore + locationScore + workModeScore));
}

export function parseYearsExperience(value: string | null): number {
  if (!value) return 0;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function matchTier(score: number): MatchTier {
  if (score >= 90) return "Excellent Match";
  if (score >= 75) return "Good Match";
  return "Possible Match";
}

export interface WhyThisJobCheck {
  label: string;
  matched: boolean;
}

/** Bubble logic checklist — deterministic, shown on every card at zero cost. */
export function whyThisJob(profile: Profile, job: Job): WhyThisJobCheck[] {
  const skills = profile.skills ?? [];
  const requiredAndPreferred = [...(job.required_skills ?? []), ...(job.preferred_skills ?? [])];
  const skillsMatch = skillOverlap(skills, requiredAndPreferred) >= 0.4;
  const experienceMatch = profile.career_track === job.career_track;
  const candidateLocations = [profile.current_location, profile.city, ...(profile.preferred_locations ?? [])]
    .filter(Boolean)
    .map((l) => (l as string).toLowerCase());
  const jobLocations = [job.location, ...(job.locations ?? [])].map((l) => l.toLowerCase());
  const locationMatch =
    job.work_mode === "Remote" || candidateLocations.some((l) => jobLocations.some((jl) => jl.includes(l) || l.includes(jl)));
  const workModeMatch = (profile.work_preference ?? []).includes(job.work_mode);

  return [
    { label: "Skills", matched: skillsMatch },
    { label: "Experience", matched: experienceMatch },
    { label: "Location", matched: locationMatch },
    { label: "Work Mode", matched: workModeMatch },
  ];
}

/** Deterministic, single most useful improvement — no AI needed for this either. */
export function gapNudge(profile: Profile, job: Job): string | null {
  const skills = new Set((profile.skills ?? []).map((s) => s.toLowerCase()));
  const missingRequired = (job.required_skills ?? []).find((s) => !skills.has(s.toLowerCase()));
  if (missingRequired) return `Add "${missingRequired}" to your skills to strengthen this match.`;
  if (profile.career_track !== job.career_track) {
    return `This role is in ${job.career_track} — update your career track if that's a better fit.`;
  }
  if (!(profile.work_preference ?? []).includes(job.work_mode)) {
    return `This is a ${job.work_mode} role — add it to your work preferences if you're open to it.`;
  }
  return null;
}

export function matchedSkillsCount(profile: Profile, job: Job): { matched: number; total: number } {
  const skills = new Set((profile.skills ?? []).map((s) => s.toLowerCase()));
  const all = [...(job.required_skills ?? []), ...(job.preferred_skills ?? [])];
  const matched = all.filter((s) => skills.has(s.toLowerCase())).length;
  return { matched, total: all.length };
}

// --- Application Readiness ----------------------------------------------------

export interface ReadinessItem {
  key: string;
  label: string;
  ok: boolean;
}

export function calcApplicationReadiness(profile: Profile): { score: number; items: ReadinessItem[]; estimatedSeconds: number } {
  const items: ReadinessItem[] = [
    { key: "resume", label: "Resume", ok: profile.resume_uploaded },
    { key: "summary", label: "Summary", ok: !!profile.professional_summary },
    { key: "experience", label: "Experience", ok: (profile.experience?.length ?? 0) > 0 },
    { key: "salary", label: "Expected Salary", ok: profile.expected_salary != null },
  ];
  const okCount = items.filter((i) => i.ok).length;
  const score = Math.round((okCount / items.length) * 100);
  const estimatedSeconds = 15 + (items.length - okCount) * 15;
  return { score, items, estimatedSeconds };
}

// --- Auto-Match eligibility (hardcoded weights per spec) -----------------------

export interface AutoMatchEligibility {
  score: number;
  eligible: boolean;
  resumeOk: boolean;
  skillsOk: boolean;
  experienceOk: boolean;
  preferencesOk: boolean;
  photoOk: boolean;
  resumeFresh: boolean;
  statusLooking: boolean;
}

export function calcAutoMatchEligibility(profile: Profile): AutoMatchEligibility {
  const resumeOk = profile.resume_uploaded;
  const primaryCount = (profile.skills_detail ?? []).filter((s) => s.primary).length;
  const skillsOk = primaryCount >= 3;
  const experienceOk = (profile.experience?.length ?? 0) > 0;
  const preferencesOk = profile.preferences_completed;
  const photoOk = profile.profile_photo_consent;

  const score =
    (resumeOk ? 40 : 0) +
    (skillsOk ? 25 : 0) +
    (experienceOk ? 15 : 0) +
    (preferencesOk ? 15 : 0) +
    (photoOk ? 5 : 0);

  const lastUpdate = profile.last_resume_upload_at ? new Date(profile.last_resume_upload_at).getTime() : 0;
  const resumeFresh = lastUpdate > 0 && Date.now() - lastUpdate < 90 * 24 * 60 * 60 * 1000;
  const statusLooking = profile.availability_status === "Actively Looking";

  return {
    score,
    eligible: score >= 95 && resumeFresh && statusLooking,
    resumeOk,
    skillsOk,
    experienceOk,
    preferencesOk,
    photoOk,
    resumeFresh,
    statusLooking,
  };
}
