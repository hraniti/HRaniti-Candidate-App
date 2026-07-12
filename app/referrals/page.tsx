"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile, Referral, ReferralPayment, ReferralBadgeRow, ReferralBadgeKey } from "@/lib/types";
import { REWARD_TIERS, trustedReferrerLevel, LEVEL_ICON, pipelineValue, formatINR } from "@/lib/referralRewards";
import Button from "@/components/Button";
import { Copy, TrendingUp, Users, Award } from "lucide-react";

const BADGE_INFO: Record<ReferralBadgeKey, { icon: string; label: string }> = {
  first_referral: { icon: "🏅", label: "First Referral" },
  first_hire: { icon: "🏅", label: "First Hire" },
  "50k_club": { icon: "🏅", label: "₹50K Club" },
  "1l_club": { icon: "🏅", label: "₹1L Club" },
  top_referrer: { icon: "🏅", label: "Top Referrer" },
};

export default function ReferralDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payments, setPayments] = useState<ReferralPayment[]>([]);
  const [badges, setBadges] = useState<ReferralBadgeRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ name: string; earnings: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: refs }, { data: pays }, { data: badgeRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("referrals").select("*").eq("referrer_id", user.id),
        supabase.from("referral_payments").select("*").eq("user_id", user.id),
        supabase.from("referral_badges").select("*").eq("user_id", user.id),
      ]);

      setProfile(p as Profile);
      setReferrals((refs as Referral[]) ?? []);
      setPayments((pays as ReferralPayment[]) ?? []);
      setBadges((badgeRows as ReferralBadgeRow[]) ?? []);

      // Leaderboard stays hidden until 100+ active referrers exist, per spec.
      const { count: activeReferrers } = await supabase
        .from("referrals")
        .select("referrer_id", { count: "exact", head: true })
        .eq("status", "Paid");
      if ((activeReferrers ?? 0) >= 100) {
        // Real leaderboard query would aggregate across all users server-side;
        // left as a stub since it needs 100+ referrers to make sense at all.
        setLeaderboard([]);
      }

      setLoading(false);
    })();
  }, []);

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  const paidPayments = payments.filter((p) => p.status === "paid");
  const lifetimeEarnings = paidPayments.reduce((sum, p) => sum + p.amount_inr, 0);
  const thisMonth = new Date();
  const thisMonthEarnings = paidPayments
    .filter((p) => p.paid_at && new Date(p.paid_at).getMonth() === thisMonth.getMonth() && new Date(p.paid_at).getFullYear() === thisMonth.getFullYear())
    .reduce((sum, p) => sum + p.amount_inr, 0);
  const pending = referrals
    .filter((r) => ["Joined", "Payment Processing"].includes(r.status))
    .reduce((sum, r) => sum + (r.reward_amount_inr ?? 0), 0);
  const potential = pipelineValue(referrals);
  const successfulHires = referrals.filter((r) => r.status === "Paid").length;
  const level = trustedReferrerLevel(successfulHires);
  const avgReward =
    paidPayments.length > 0 ? Math.round(lifetimeEarnings / paidPayments.length) : 6500;

  const profileLink = `hraniti.com/r/${profile.profile_slug ?? profile.id.slice(0, 8)}`;

  function copyLink() {
    navigator.clipboard.writeText(`https://${profileLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Hero banner */}
      <section className="paper-card p-6 mb-6 bg-gradient-to-br from-ink to-ink-light text-white">
        <p className="text-lg font-display mb-1">Earn ₹4,000 – ₹10,000 for every successful hire.</p>
        <p className="text-sm text-white/80 mb-4">Refer your friends. We'll do the hiring. You get paid.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push("/referrals/refer")}>Refer Candidate</Button>
          <Button variant="secondary" onClick={copyLink}>
            <Copy size={14} /> {copied ? "Copied!" : "Copy Referral Link"}
          </Button>
          <Button variant="secondary" onClick={() => router.push("/referrals/payments")}>View Earnings</Button>
        </div>
      </section>

      {/* Trusted Referrer Level */}
      <section className="paper-card p-6 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Trusted Referrer Level</p>
          <p className="text-xs text-ink-soft">Based on successful hires — doesn't affect AI Match Score</p>
        </div>
        <span className="text-2xl">{LEVEL_ICON[level]}</span>
        <span className="font-mono text-sm text-ink">{level === "None" ? "Not yet ranked" : level}</span>
      </section>

      {/* Earnings summary */}
      <section className="paper-card p-6 mb-6">
        <h2 className="font-medium text-ink mb-3">Earnings Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Metric label="Lifetime Earnings" value={formatINR(lifetimeEarnings)} highlight />
          <Metric label="Pending" value={formatINR(pending)} />
          <Metric label="This Month" value={formatINR(thisMonthEarnings)} />
          <Metric label="Potential (Pipeline)" value={formatINR(potential)} />
          <Metric label="Average Reward" value={formatINR(avgReward)} />
          <Metric label="Candidates Referred" value={String(referrals.length)} />
        </div>
        {profile.network_connections_count > 0 && (
          <div className="mt-4 pt-4 dashed-divider flex items-center gap-2 text-sm text-ink-soft">
            <Users size={14} />
            Your Network: {profile.network_connections_count} Connections · Potential Earnings:{" "}
            {formatINR(Math.round(profile.network_connections_count * avgReward * 0.02))}
          </div>
        )}
      </section>

      {/* Reward structure */}
      <section className="paper-card p-6 mb-6">
        <h2 className="font-medium text-ink mb-3">Reward Structure</h2>
        <div className="space-y-2">
          {REWARD_TIERS.map((t) => (
            <div key={t.tier} className="flex items-center justify-between text-sm border-b border-line last:border-0 py-2">
              <div>
                <p className="text-ink">{t.label}</p>
                <p className="text-xs text-ink-soft">{t.range}</p>
              </div>
              <p className="font-mono text-ink">{formatINR(t.amount)}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-soft mt-3">Paid after successful joining + probation (90 days).</p>
      </section>

      {/* Leaderboard - hidden until 100+ active referrers */}
      {leaderboard && (
        <section className="paper-card p-6 mb-6">
          <h2 className="font-medium text-ink mb-3">Referral Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-ink-soft italic">Not enough data yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-ink">#{i + 1} {l.name}</span>
                  <span className="font-mono text-ink">{formatINR(l.earnings)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Achievement badges */}
      <section className="paper-card p-6">
        <h2 className="inline-flex items-center gap-1.5 font-medium text-ink mb-3">
          <Award size={15} className="text-gold" /> Achievement Badges
        </h2>
        {badges.length === 0 ? (
          <p className="text-sm text-ink-soft italic">No badges yet — refer your first candidate to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.id} className="inline-flex items-center gap-1.5 bg-paper border border-line rounded-full px-3 py-1.5 text-xs text-ink">
                {BADGE_INFO[b.badge].icon} {BADGE_INFO[b.badge].label}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-ink text-white" : "bg-paper text-ink"}`}>
      <p className={`font-mono text-lg ${highlight ? "text-white" : "text-ink"}`}>{value}</p>
      <p className={`text-[10px] ${highlight ? "text-white/70" : "text-ink-soft"}`}>{label}</p>
    </div>
  );
}
