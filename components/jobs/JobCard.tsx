"use client";

import { useState } from "react";
import Link from "next/link";
import { Job, Profile } from "@/lib/types";
import { calcMatchScore, matchTier, whyThisJob, gapNudge } from "@/lib/jobMatching";
import { formatSalary } from "@/lib/currency";
import MatchBadge from "./MatchBadge";
import Button from "@/components/Button";
import { formatINR } from "@/lib/referralRewards";
import { Bookmark, BookmarkCheck, CheckCircle2, XCircle, Sparkles, TrendingUp, Clock, Share2 } from "lucide-react";

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

export default function JobCard({
  job,
  profile,
  saved,
  applied,
  onToggleSave,
  onQuickApply,
}: {
  job: Job;
  profile: Profile;
  saved: boolean;
  applied: boolean;
  onToggleSave: (jobId: string) => void;
  onQuickApply: (job: Job) => void;
}) {
  const score = calcMatchScore(profile, job);
  const tier = matchTier(score);
  const checks = whyThisJob(profile, job);
  const nudge = gapNudge(profile, job);

  const [explainState, setExplainState] = useState<"idle" | "loading" | "shown" | "dismissed">("idle");
  const [explainText, setExplainText] = useState("");
  const [improveState, setImproveState] = useState<"idle" | "loading" | "shown">("idle");
  const [improveData, setImproveData] = useState<{ suggestion: string; estimated_gain: number } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  function copyReferralLink() {
    const link = `https://hraniti.com/r/${profile.profile_slug ?? profile.id.slice(0, 8)}/${job.referral_slug ?? job.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  async function explainFurther() {
    setExplainState("loading");
    try {
      const res = await fetch("/api/jobs/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, type: "explain_further" }),
      });
      const data = await res.json();
      setExplainText(data.content?.text ?? "Couldn't generate an explanation right now.");
      setExplainState("shown");
    } catch {
      setExplainState("dismissed");
    }
  }

  async function improveMatch() {
    setImproveState("loading");
    try {
      const res = await fetch("/api/jobs/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, type: "improve_match" }),
      });
      const data = await res.json();
      setImproveData(data.content);
      setImproveState("shown");
    } catch {
      setImproveState("idle");
    }
  }

  return (
    <div className="paper-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <Link href={`/jobs/${job.id}`} className="font-medium text-ink hover:underline">
            {job.title}
          </Link>
          <p className="text-sm text-ink-soft">
            {job.company} · {job.location}
          </p>
        </div>
        <button onClick={() => onToggleSave(job.id)} className="text-ink-soft hover:text-gold shrink-0" aria-label="Save job">
          {saved ? <BookmarkCheck size={18} className="text-gold fill-gold" /> : <Bookmark size={18} />}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <MatchBadge tier={tier} />
        {job.urgent_hiring && (
          <span className="text-[11px] font-mono text-alert bg-alert/10 border border-alert/30 rounded-full px-2.5 py-1">
            🔥 Urgent Hiring
          </span>
        )}
        <span className="text-[11px] text-ink-soft font-mono">{timeAgo(job.created_at)}</span>
      </div>

      {/* Bubble logic — deterministic, zero cost */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {checks.map((c) => (
          <span key={c.label} className={`inline-flex items-center gap-1 text-xs ${c.matched ? "text-verified" : "text-ink-soft/60"}`}>
            {c.matched ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {c.label}
          </span>
        ))}
      </div>

      {nudge && <p className="text-xs text-gold mb-3">💡 {nudge}</p>}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft mb-2">
        <span>{job.employment_type}</span>
        <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
        <span>{job.work_mode}</span>
      </div>

      {job.reward_amount_inr && (
        <p className="text-[11px] font-mono text-gold bg-gold/10 border border-gold/30 rounded-full inline-block px-2.5 py-1 mb-4">
          💰 Earn {formatINR(job.reward_amount_inr)} by referring • Paid after successful joining + probation
        </p>
      )}

      {/* Explain Further — AI on click only, with "Not now" per spec */}
      {explainState === "idle" && (
        <div className="flex items-center gap-3 mb-3">
          <button onClick={explainFurther} className="inline-flex items-center gap-1 text-xs text-ink hover:text-ink-light">
            <Sparkles size={12} className="text-gold" /> Explain Further
          </button>
          <button onClick={() => setExplainState("dismissed")} className="text-xs text-ink-soft underline underline-offset-4">
            Not now
          </button>
        </div>
      )}
      {explainState === "loading" && <p className="text-xs text-ink-soft mb-3 font-mono">Thinking…</p>}
      {explainState === "shown" && (
        <p className="text-xs text-ink-soft bg-paper rounded-lg p-3 mb-3">{explainText}</p>
      )}

      {/* Improve Match — AI on click only */}
      {improveState === "idle" && (
        <button onClick={improveMatch} className="inline-flex items-center gap-1 text-xs text-ink hover:text-ink-light mb-4">
          <TrendingUp size={12} /> Improve Match
        </button>
      )}
      {improveState === "loading" && <p className="text-xs text-ink-soft mb-4 font-mono">Calculating…</p>}
      {improveState === "shown" && improveData && (
        <div className="text-xs bg-gold/10 border border-gold/30 rounded-lg p-3 mb-4">
          <p className="font-mono text-ink mb-1">
            Estimated Match: {score}% → {Math.min(99, score + improveData.estimated_gain)}%
          </p>
          <p className="text-ink-soft">{improveData.suggestion}</p>
        </div>
      )}

      <div className="flex gap-3 items-center flex-wrap">
        {applied ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-verified font-medium">
            <CheckCircle2 size={15} /> Applied
          </span>
        ) : (
          <Button onClick={() => onQuickApply(job)}>Quick Apply</Button>
        )}
        <Link href={`/jobs/${job.id}`}>
          <Button variant="secondary">View Details</Button>
        </Link>
        <button onClick={copyReferralLink} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
          <Share2 size={12} /> {linkCopied ? "Link copied!" : "Share & Earn"}
        </button>
      </div>
    </div>
  );
}
