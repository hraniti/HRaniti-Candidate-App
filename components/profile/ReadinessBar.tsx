"use client";

import { Profile } from "@/lib/types";
import { calcEmployerReadiness, readinessTier, getNudges } from "@/lib/employerReadiness";

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function ReadinessBar({ profile }: { profile: Profile }) {
  const score = calcEmployerReadiness(profile);
  const tier = readinessTier(score);
  const nudges = getNudges(profile);

  const barColor =
    tier === "green" ? "bg-verified" : tier === "amber" ? "bg-gold" : "bg-alert";

  return (
    <section className="paper-card p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-ink">Employer Readiness</p>
        <p className="font-mono text-sm text-ink">{score}%</p>
      </div>
      <div className="h-2 w-full bg-line rounded-full overflow-hidden mb-3">
        <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-ink-soft mb-3">Complete your profile to receive better job matches.</p>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-ink-soft font-mono mb-3">
        <span>Profile updated {timeAgo(profile.updated_at ?? null)}</span>
        <span>AI updated {timeAgo(profile.ai_updated_at)}</span>
      </div>

      {nudges.length > 0 && (
        <ul className="space-y-1.5 pt-3 dashed-divider">
          {nudges.map((n) => (
            <li key={n.key} className="text-xs text-ink-soft flex items-start gap-1.5">
              <span className="text-gold mt-0.5">•</span> {n.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
