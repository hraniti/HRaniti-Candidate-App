"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";

const PERKS = [
  "AI matched jobs",
  "Verified employers",
  "Fast hiring",
  "One profile",
  "Free assessments",
  "Interview preparation",
];

export default function ReferralLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [referrer, setReferrer] = useState<{ name: string; level: string; levelIcon: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        localStorage.setItem("hraniti_referral", JSON.stringify({ referrerSlug: slug, jobSlug: null }));
      } catch {}
      const res = await fetch(`/api/referrals/landing?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (!res.ok) {
        setNotFound(true);
      } else {
        setReferrer(data.referrer);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <main className="min-h-screen bg-paper flex items-center justify-center"><p className="font-mono text-sm text-ink-soft">Loading…</p></main>;
  }

  // Never show a bare 404 — always fall back to a friendly registration path.
  if (notFound) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="paper-card p-8 max-w-md text-center">
          <span className="font-display italic text-lg text-ink block mb-4">HRaniti</span>
          <p className="text-ink-soft mb-5">This referral link isn't active anymore, but you can still join HRaniti directly.</p>
          <Button onClick={() => router.push("/signup")}>Create Free Profile</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        <span className="font-display italic text-lg text-ink block text-center mb-6">HRaniti</span>
        <div className="paper-card p-8 text-center">
          {referrer && (
            <p className="text-xs text-ink-soft mb-4">
              {referrer.levelIcon} Referred by {referrer.name}
              {referrer.level !== "None" && <span className="text-gold"> · {referrer.level} Trusted Referrer</span>}
            </p>
          )}
          <h1 className="font-display text-2xl text-ink mb-4">Earn better career opportunities.</h1>
          <ul className="text-left space-y-2 mb-6">
            {PERKS.map((p) => (
              <li key={p} className="text-sm text-ink-soft flex items-center gap-2">
                <span className="text-verified">✔</span> {p}
              </li>
            ))}
          </ul>
          <Button className="w-full justify-center" onClick={() => router.push(`/signup?ref=${slug}`)}>
            Create Free Profile
          </Button>
        </div>
      </div>
    </main>
  );
}
