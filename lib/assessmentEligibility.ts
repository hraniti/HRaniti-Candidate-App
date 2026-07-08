import { AssessmentResultFull } from "./types";

export interface AssessmentEligibility {
  canTake: boolean;
  reason: "none" | "valid_reuse" | "cooldown";
  latestResult: AssessmentResultFull | null;
  cooldownEndsAt: string | null;
}

/**
 * Given the most recent results for a specific assessment (+ language/track
 * where relevant), decides whether the candidate can take it again.
 * Passing (80%+) is frozen and reused for 180 days — retaking isn't blocked,
 * but the UI should show "already qualified" instead of pushing a retake.
 * Failing (<80%) triggers a 30-day cooldown for that exact assessment only.
 */
export function checkAssessmentEligibility(results: AssessmentResultFull[]): AssessmentEligibility {
  if (results.length === 0) {
    return { canTake: true, reason: "none", latestResult: null, cooldownEndsAt: null };
  }
  const latest = [...results].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  )[0];

  const now = Date.now();

  if (latest.passed && latest.valid_until && new Date(latest.valid_until).getTime() > now) {
    return { canTake: false, reason: "valid_reuse", latestResult: latest, cooldownEndsAt: null };
  }

  if (!latest.passed && latest.cooldown_until && new Date(latest.cooldown_until).getTime() > now) {
    return { canTake: false, reason: "cooldown", latestResult: latest, cooldownEndsAt: latest.cooldown_until };
  }

  return { canTake: true, reason: "none", latestResult: latest, cooldownEndsAt: null };
}

export function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}
