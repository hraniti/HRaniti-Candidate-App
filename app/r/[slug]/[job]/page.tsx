"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { formatINR } from "@/lib/referralRewards";

const PERKS = ["AI matched jobs", "Verified employers", "Fast hiring", "One profile", "Free assessments", "Interview preparation"];

export default function RoleReferralLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const jobSlug = params.job as string;
  const [referrer, setReferrer] = useState<{ name: string; level: string; levelIcon: string } | null>(null);
  const [job, setJob] = useState<{ title: string; company: string; location: string; reward_amount_inr: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        localStorage.setItem("hraniti_referral", JSON.stringify({ referrerSlug: slug, jobSlug }));
      } catch {}
      const res = await fetch(`/api/referrals/landing?slug=${encodeURIComponent(slug)}&job=${encodeURIComponent(jobSlug)}`);
      const data = await res.json();
      if (!res.ok) {
        setNotFound(true);
      } else {
        setReferrer(data.referrer);
        setJob(data.job);
      }
      setLoading(false);
    })();
  }, [slug, jobSlug]);

  if (loading) {
    return <main className="min-h-screen bg-paper flex items-center justify-center"><p className="font-mono text-sm text-ink-soft">Loading…</p></main>;
  }

  // Job Deactivation Handler — never a bare 404, always fall back gracefully.
  if (notFound || !job) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="paper-card p-8 max-w-md text-center">
          <span className="inline-flex items-center gap-2 mb-4"><img src="/brand/logo-icon.png" alt="" className="h-5 w-auto" /><span className="font-display italic text-lg text-ink">HRaniti</span></span> <p className="text-ink-soft mb-5">This role isn't currently open, but you can still create a free profile and get matched to similar opportunities.</p> <Button onClick={() => router.push("/signup")}>Create Free Profile</Button> </div> </main> ); } return ( <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10"> <div className="max-w-md w-full"> <span className="font-display italic text-lg text-ink text-center mb-6"><img src="/brand/logo-icon.png" alt="" className="h-5 w-auto" /><span className="font-display italic text-lg text-ink">HRaniti</span></span>
        <div className="paper-card p-8 text-center">
          {referrer && (
            <p className="text-xs text-ink-soft mb-2">
              {referrer.levelIcon} Referred by {referrer.name}
              {referrer.level !== "None" && <span className="text-gold"> · {referrer.level} Trusted Referrer</span>}
            </p>
          )}
          <p className="text-xs font-mono text-gold bg-gold/10 border border-gold/30 rounded-full inline-block px-3 py-1 mb-4">
            Earn {formatINR(job.reward_amount_inr)} if you get hired • Paid after joining + probation
          </p>
          <h1 className="font-display text-2xl text-ink mb-1">{job.title}</h1>
          <p className="text-ink-soft mb-5">{job.company} · {job.location}</p>
          <ul className="text-left space-y-2 mb-6">
            {PERKS.map((p) => (
              <li key={p} className="text-sm text-ink-soft flex items-center gap-2"><span className="text-verified">✔</span> {p}</li>
            ))}
          </ul>
          <Button className="w-full justify-center" onClick={() => router.push(`/signup?ref=${slug}&job=${jobSlug}`)}>
            Create Free Profile
          </Button>
        </div>
      </div>
    </main>
  );
}
