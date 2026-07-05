import { Profile } from "./types";

// Career track → short code used in the anonymized candidate handle.
const TRACK_CODES: Record<string, string> = {
  "ERP": "ERP",
  "Data & Analytics": "DATA",
  "AI / ML": "AI",
  "Cloud / DevOps": "CLD",
  "Semiconductor & Embedded": "SEMI",
  "Life Sciences & Pharma": "LIFE",
  "Other Technology": "TECH",
};

// Deterministic 3-digit number from the profile id, so the same candidate
// always gets the same anonymized code (stable across page reloads) without
// ever needing to store it separately.
function stableSuffix(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String(100 + (hash % 900)); // always 3 digits, 100-999
}

/**
 * Employers should never see a candidate's real name, email, or phone until
 * they've requested an interview (the "unlock" moment) — this is what stops
 * an employer from taking a candidate straight to LinkedIn/email and
 * bypassing the platform entirely. Until that unlock exists (Phase 3:
 * employer side), every employer-facing preview uses this anonymized handle
 * instead of real identity.
 */
export function anonymizedHandle(profile: Pick<Profile, "id" | "career_track">): string {
  const code = (profile.career_track && TRACK_CODES[profile.career_track]) || "CAND";
  return `Candidate #${code}-${stableSuffix(profile.id)}`;
}
