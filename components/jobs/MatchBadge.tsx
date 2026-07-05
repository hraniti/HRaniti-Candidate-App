import { MatchTier } from "@/lib/jobMatching";

export default function MatchBadge({ tier, score }: { tier: MatchTier; score?: number }) {
  const styles: Record<MatchTier, string> = {
    "Excellent Match": "bg-verified/10 text-verified border-verified/30",
    "Good Match": "bg-gold/10 text-gold border-gold/30",
    "Possible Match": "bg-paper text-ink-soft border-line",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-mono ${styles[tier]}`}>
      {tier}
      {score !== undefined && <span className="opacity-70">· {score}%</span>}
    </span>
  );
}
