import { Profile, Referral, RewardTier, TrustedReferrerLevel } from "./types";

export const REWARD_TIERS: { tier: RewardTier; label: string; amount: number; range: string }[] = [
  { tier: "Entry", label: "Entry Level", amount: 4000, range: "0–4 Years" },
  { tier: "Mid", label: "Mid Level", amount: 6500, range: "4.1–8 Years" },
  { tier: "Senior", label: "Senior Level", amount: 8500, range: "8.1–12 Years" },
  { tier: "Leadership", label: "Leadership", amount: 10000, range: "12.1+ Years" },
];

export function rewardForExperience(years: number): { tier: RewardTier; amount: number } {
  if (years <= 4) return { tier: "Entry", amount: 4000 };
  if (years <= 8) return { tier: "Mid", amount: 6500 };
  if (years <= 12) return { tier: "Senior", amount: 8500 };
  return { tier: "Leadership", amount: 10000 };
}

/** Bronze/Silver/Gold/Platinum — informational only, never affects AI Match Score. */
export function trustedReferrerLevel(successfulHires: number): TrustedReferrerLevel {
  if (successfulHires >= 11) return "Platinum";
  if (successfulHires >= 6) return "Gold";
  if (successfulHires >= 3) return "Silver";
  if (successfulHires >= 1) return "Bronze";
  return "None";
}

export const LEVEL_ICON: Record<TrustedReferrerLevel, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  None: "—",
};

/** Date of joining + 90 days, rounded to the next upcoming Friday. */
export function expectedPaymentDate(joinedDate: Date): Date {
  const target = new Date(joinedDate);
  target.setDate(target.getDate() + 90);
  const day = target.getDay(); // 0 = Sunday ... 5 = Friday
  const daysUntilFriday = (5 - day + 7) % 7;
  target.setDate(target.getDate() + daysUntilFriday);
  return target;
}

/** Sum of rewards for referrals currently in Applied/Interviewing/Offer stages. */
export function pipelineValue(referrals: Referral[]): number {
  return referrals
    .filter((r) => ["Applied", "Interviewing", "Offer"].includes(r.status))
    .reduce((sum, r) => sum + (r.reward_amount_inr ?? 0), 0);
}

/** Referral Readiness — tells the referrer how likely THIS candidate is to succeed. */
export function calcReferralReadiness(candidate: Partial<Profile>): { score: number; items: { label: string; ok: boolean }[] } {
  const items = [
    { label: "Resume uploaded", ok: !!candidate.resume_uploaded },
    { label: "Profile completed", ok: (candidate.experience?.length ?? 0) > 0 && !!candidate.professional_summary },
    { label: "Open to work", ok: candidate.availability_status === "Actively Looking" || candidate.availability_status === "Open to Opportunities" },
    { label: "Contact verified", ok: !!candidate.email },
  ];
  const okCount = items.filter((i) => i.ok).length;
  return { score: Math.round((okCount / items.length) * 100), items };
}

export function readinessLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

/** KYC kicks in once a referrer crosses ₹8,500 in earned bonuses. */
export const KYC_THRESHOLD_INR = 8500;

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
