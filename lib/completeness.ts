import { Profile } from "./types";

// Weights mirror the spec's Screen 8 breakdown:
// Resume 40% / Experience 20% / Skills 20% / Preferences 10% / Certifications 10%
export function calcCompleteness(p: Partial<Profile>): number {
  let score = 0;
  if (p.resume_uploaded) score += 40;
  if (p.experience && p.experience.length > 0) score += 20;
  if (p.skills && p.skills.length > 0) score += 20;
  if (p.preferences_completed) score += 10;
  if (p.certifications && p.certifications.length > 0) score += 10;
  return Math.min(score, 100);
}
