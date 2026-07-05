import { Profile } from "./types";

// Internal weights only — never shown to the candidate, per spec:
// Experience 30 / Skills 25 / Resume 20 / Certifications 15 / Preferences 10
export function calcEmployerReadiness(p: Partial<Profile>): number {
  let score = 0;
  if (p.resume_uploaded) score += 20;
  if (p.experience && p.experience.length > 0) score += 30;
  const skillCount = p.skills_detail?.length ?? p.skills?.length ?? 0;
  score += Math.min(25, (skillCount / 5) * 25);
  if (p.certifications && p.certifications.length > 0) score += 15;
  if (p.preferences_completed) score += 10;
  return Math.round(Math.min(score, 100));
}

export function readinessTier(score: number): "green" | "amber" | "red" {
  if (score >= 80) return "green";
  if (score >= 50) return "amber";
  return "red";
}

export interface Nudge {
  key: string;
  text: string;
}

export function getNudges(p: Partial<Profile>): Nudge[] {
  const nudges: Nudge[] = [];
  if (!p.current_company) {
    nudges.push({ key: "current_company", text: "Add your current company to appear in employer searches." });
  }
  if (!p.current_designation) {
    nudges.push({ key: "current_designation", text: "Your current title helps employers understand your level." });
  }
  const skillCount = p.skills_detail?.length ?? p.skills?.length ?? 0;
  if (skillCount < 5) {
    nudges.push({ key: "skills", text: `Add ${5 - skillCount} more skill${5 - skillCount === 1 ? "" : "s"} to improve your match rate by 25%.` });
  }
  if (!p.certifications || p.certifications.length === 0) {
    nudges.push({ key: "certifications", text: "Candidates with certifications get 2x more profile views." });
  }
  return nudges;
}
