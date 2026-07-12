import { Job } from "./types";

/**
 * Simple deterministic keyword matching — no AI, no regex-heavy parsing, per
 * spec ("Bubble database filtering. No AI. No Regex."). Used for CSV network
 * import and the "Upload Resume and Refer" flow, where all we have is a
 * free-text role/title, not a full structured profile.
 */
export function matchJobsByRoleText(roleText: string, jobs: Job[], limit = 5): Job[] {
  if (!roleText?.trim()) return [];
  const words = roleText.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  const scored = jobs.map((job) => {
    const haystack = `${job.title} ${job.career_track} ${(job.required_skills ?? []).join(" ")}`.toLowerCase();
    const score = words.filter((w) => haystack.includes(w)).length;
    return { job, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.job);
}

export function generateReferralSlug(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
