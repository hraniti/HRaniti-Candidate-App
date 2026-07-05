"use client";

import { Profile } from "@/lib/types";
import { calcAutoMatchEligibility } from "@/lib/jobMatching";
import { Zap, CheckCircle2, XCircle } from "lucide-react";

export default function AutoMatchCard({
  profile,
  onToggle,
}: {
  profile: Profile;
  onToggle: (v: boolean) => void;
}) {
  const e = calcAutoMatchEligibility(profile);

  const requirements = [
    { label: "Profile 95%+ complete", ok: e.score >= 95 },
    { label: "Resume updated within 90 days", ok: e.resumeFresh },
    { label: "Status: Actively Looking", ok: e.statusLooking },
  ];

  return (
    <section className="paper-card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-2 font-medium text-ink">
          <Zap size={16} className="text-gold" /> Auto-Match Visibility
        </span>
        <button
          role="switch"
          aria-checked={profile.auto_match_enabled}
          disabled={!e.eligible}
          onClick={() => onToggle(!profile.auto_match_enabled)}
          className={`w-11 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-40 ${
            profile.auto_match_enabled ? "bg-verified" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              profile.auto_match_enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-ink-soft mb-3">
        {profile.auto_match_enabled
          ? "Employers with matching roles can discover your profile automatically."
          : "Turn this on to let strong-match employers discover you automatically."}
      </p>
      <div className="space-y-1.5">
        {requirements.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            {r.ok ? <CheckCircle2 size={13} className="text-verified" /> : <XCircle size={13} className="text-line" />}
            <span className={r.ok ? "text-ink" : "text-ink-soft"}>{r.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 size={13} className="text-ink-soft" />
          <span className="text-ink-soft">Not already applied — checked per job</span>
        </div>
      </div>
    </section>
  );
}
