"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Referral, ReferralStatus } from "@/lib/types";
import { calcReferralReadiness, readinessLabel, formatINR } from "@/lib/referralRewards";
import { ChevronDown, CheckCircle2, Circle } from "lucide-react";

const JOURNEY_STAGES: ReferralStatus[] = ["Shared", "Registered", "Applied", "Interviewing", "Offer", "Joined", "Paid"];

const RULES = [
  "Reward is eligible if, at the time of referral submission, the candidate has not already applied for that job and has not already been referred for that job by another user.",
  "Candidate should complete probation (90 days).",
  "One reward per candidate per job requisition.",
  "Self referrals are not allowed.",
  "Fake referrals will be banned.",
  "Referrer must have permission from the candidate.",
  "Reward is based on the Job's required experience level.",
];

const FAQS = [
  { q: "When do I get paid?", a: "90 days after joining, on the next Friday batch." },
  { q: "Can I refer more than one person?", a: "Yes, unlimited." },
  { q: "Can I refer the same candidate twice?", a: "Yes, for different job requisitions." },
  { q: "Can I refer myself?", a: "No." },
  { q: "Why was my reward rejected?", a: "Check status. Common reasons: already applied, already referred, self-referral, policy violation." },
];

export default function MyReferralsPage() {
  const supabase = createClient();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [candidateProfiles, setCandidateProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Referral | null>(null);
  const [showFaqIdx, setShowFaqIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: refs } = await supabase
        .from("referrals")
        .select("*, job:jobs(*)")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      const list = (refs as Referral[]) ?? [];
      setReferrals(list);

      const candidateIds = list.map((r) => r.candidate_user_id).filter(Boolean) as string[];
      if (candidateIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", candidateIds);
        const map: Record<string, Profile> = {};
        (profiles ?? []).forEach((p: any) => (map[p.id] = p));
        setCandidateProfiles(map);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  const totalReferred = referrals.length;
  const appliedCount = referrals.filter((r) => JOURNEY_STAGES.indexOf(r.status) >= JOURNEY_STAGES.indexOf("Applied")).length;
  const interviewCount = referrals.filter((r) => JOURNEY_STAGES.indexOf(r.status) >= JOURNEY_STAGES.indexOf("Interviewing")).length;
  const offerCount = referrals.filter((r) => JOURNEY_STAGES.indexOf(r.status) >= JOURNEY_STAGES.indexOf("Offer")).length;
  const joinedCount = referrals.filter((r) => JOURNEY_STAGES.indexOf(r.status) >= JOURNEY_STAGES.indexOf("Joined")).length;

  return (
    <div>
      {/* Conversion analytics */}
      <section className="paper-card p-6 mb-6">
        <h2 className="font-medium text-ink mb-3">Referral Conversion</h2>
        <div className="flex items-center justify-between text-center text-sm">
          {[
            ["Referred", totalReferred],
            ["Applied", appliedCount],
            ["Interview", interviewCount],
            ["Offer", offerCount],
            ["Joined", joinedCount],
          ].map(([label, val], i) => (
            <div key={i} className="flex-1">
              <p className="font-mono text-lg text-ink">{val}</p>
              <p className="text-[11px] text-ink-soft">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline table */}
      <section className="paper-card p-6 mb-6">
        <h2 className="font-medium text-ink mb-3">Referral Pipeline</h2>
        {referrals.length === 0 && <p className="text-sm text-ink-soft italic">No referrals yet.</p>}
        <div className="space-y-2">
          {referrals.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(selected?.id === r.id ? null : r)}
              className="w-full text-left border border-line rounded-lg px-3 py-2.5 hover:border-ink/40"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-ink">{r.candidate_name || r.candidate_email}</p>
                  <p className="text-xs text-ink-soft">{r.job?.title ?? "General referral"}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-ink">{r.reward_amount_inr ? formatINR(r.reward_amount_inr) : "—"}</p>
                  <p className="text-xs text-ink-soft">{r.status}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Candidate detail panel */}
      {selected && (
        <section className="paper-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-ink">{selected.candidate_name || selected.candidate_email}</h2>
            <button onClick={() => setSelected(null)} className="text-ink-soft hover:text-ink text-sm">Close</button>
          </div>
          {selected.candidate_linkedin && (
            <a href={selected.candidate_linkedin} target="_blank" rel="noreferrer" className="text-xs text-ink underline underline-offset-4 block mb-3">
              View LinkedIn
            </a>
          )}

          {/* Journey tracker */}
          <div className="mb-5">
            <p className="text-xs font-medium text-ink-soft mb-2">Journey</p>
            <div className="space-y-1.5">
              {JOURNEY_STAGES.map((stage) => {
                const reached = JOURNEY_STAGES.indexOf(selected.status) >= JOURNEY_STAGES.indexOf(stage);
                return (
                  <div key={stage} className="flex items-center gap-2 text-sm">
                    {reached ? <CheckCircle2 size={14} className="text-verified" /> : <Circle size={14} className="text-line" />}
                    <span className={reached ? "text-ink" : "text-ink-soft"}>{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Referral readiness */}
          {selected.candidate_user_id && candidateProfiles[selected.candidate_user_id] && (
            <div className="mb-5 pt-4 dashed-divider">
              {(() => {
                const readiness = calcReferralReadiness(candidateProfiles[selected.candidate_user_id]);
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-ink-soft">Referral Readiness</p>
                      <p className="font-mono text-sm text-ink">{readiness.score}% — {readinessLabel(readiness.score)}</p>
                    </div>
                    <div className="space-y-1">
                      {readiness.items.map((i) => (
                        <div key={i.label} className="flex items-center gap-2 text-xs">
                          {i.ok ? <CheckCircle2 size={12} className="text-verified" /> : <Circle size={12} className="text-line" />}
                          <span className={i.ok ? "text-ink" : "text-ink-soft"}>{i.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Payment tracker */}
          {selected.reward_amount_inr && (
            <div className="pt-4 dashed-divider">
              <p className="text-xs font-medium text-ink-soft mb-1">Payment Tracker</p>
              <p className="text-sm text-ink">
                {formatINR(selected.reward_amount_inr)} • {selected.status}
                {selected.expected_payment_date && ` • Expected ${new Date(selected.expected_payment_date).toLocaleDateString()}`}
              </p>
            </div>
          )}

          {selected.recommendation_note && (
            <div className="mt-4 pt-4 dashed-divider">
              <p className="text-xs font-medium text-ink-soft mb-1">Your Recommendation Note</p>
              <p className="text-sm text-ink-soft italic">"{selected.recommendation_note}"</p>
            </div>
          )}
        </section>
      )}

      {/* Rules */}
      <section className="paper-card p-6 mb-6">
        <h2 className="font-medium text-ink mb-3">📋 Referral Rules</h2>
        <ul className="space-y-1.5">
          {RULES.map((r, i) => (
            <li key={i} className="text-xs text-ink-soft flex items-start gap-1.5">
              <span className="text-verified mt-0.5">✅</span> {r}
            </li>
          ))}
        </ul>
      </section>

      {/* FAQ */}
      <section className="paper-card p-6">
        <h2 className="font-medium text-ink mb-3">Referral FAQs</h2>
        <div className="space-y-1">
          {FAQS.map((f, i) => (
            <div key={i} className="border-b border-line last:border-0 py-2">
              <button onClick={() => setShowFaqIdx(showFaqIdx === i ? null : i)} className="w-full flex items-center justify-between text-left">
                <span className="text-sm text-ink">{f.q}</span>
                <ChevronDown size={14} className={`text-ink-soft ${showFaqIdx === i ? "rotate-180" : ""}`} />
              </button>
              {showFaqIdx === i && <p className="text-xs text-ink-soft mt-2">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
