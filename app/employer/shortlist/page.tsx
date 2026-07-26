"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import Seal from "@/components/Seal";
import { calcMatchScore } from "@/lib/jobMatching";
import type { Job, Profile } from "@/lib/types";

type DirectoryRow = {
  id: string;
  candidate_code: string;
  career_track: string | null;
  skills: string[] | null;
  years_experience: string | null;
  current_location: string | null;
  city: string | null;
  preferred_locations: string[] | null;
  work_preference: string[] | null;
  availability_status: string | null;
  resume_uploaded: boolean;
  last_resume_upload_at: string | null;
  integrity_score: number | null;
  expected_salary: number | null;
  salary_currency: string | null;
  video_pitch_score: number | null;
};

type Unlocked = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  professional_summary: string | null;
};

function freshnessDays(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ShortlistPage() {
  return (
    <Suspense fallback={null}>
      <ShortlistPageInner />
    </Suspense>
  );
}

function ShortlistPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const jobSlug = params.get("job");

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<DirectoryRow[]>([]);
  const [unlocked, setUnlocked] = useState<Record<string, Unlocked>>({});
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [minMatch, setMinMatch] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!jobSlug) {
        setLoading(false);
        return;
      }
      const { data: jobRow } = await supabase
        .from("jobs")
        .select("*")
        .eq("public_slug", jobSlug)
        .single();
      setJob(jobRow as Job);

      const { data: dirRows, error: dirError } = await supabase
        .from("candidate_directory")
        .select("*");
      if (dirError) setError(dirError.message);
      setCandidates((dirRows as DirectoryRow[]) ?? []);
      setLoading(false);
    })();
  }, [jobSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = useMemo(() => {
    if (!job) return [];
    return candidates
      .map((c) => ({
        candidate: c,
        score: calcMatchScore(c as unknown as Profile, job),
      }))
      .filter((r) => r.score >= minMatch)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [candidates, job, minMatch]);

  async function handleUnlock(candidateId: string) {
    setUnlocking(candidateId);
    const { data, error } = await supabase.rpc("unlock_candidate", {
      p_candidate_id: candidateId,
      p_job_id: job?.id ?? null,
    });
    setUnlocking(null);
    if (error) {
      setError(error.message);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setUnlocked((prev) => ({ ...prev, [candidateId]: row }));
    }
  }

  if (loading) return null;

  if (!jobSlug || !job) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-4 text-center">
        <div className="paper-card p-8 max-w-md">
          <h1 className="font-display text-xl text-ink mb-2">No job selected</h1>
          <p className="text-sm text-ink-soft mb-5">Pick a job from your list to see its shortlist.</p>
          <Button onClick={() => router.push("/employer/jobs")}>View your jobs</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">
        <span className="font-display italic text-lg text-ink block text-center mb-8">HRaniti</span>

        <div className="flex justify-between items-start mb-5">
          <div>
            <h1 className="font-display text-2xl text-ink">{job.title}</h1>
            <p className="text-sm text-ink-soft">
              Shortlist · {ranked.length} candidate{ranked.length !== 1 ? "s" : ""} from the Central Talent Pool
            </p>
          </div>
          <select
            className="text-sm border border-line rounded-lg px-3 py-1.5 bg-paper-raised"
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
          >
            <option value={0}>All matches</option>
            <option value={80}>80%+</option>
            <option value={60}>60%+</option>
          </select>
        </div>

        {error && <p className="text-sm text-alert mb-4">{error}</p>}

        {ranked.length === 0 && (
          <div className="paper-card p-6 text-center text-sm text-ink-soft">
            No matching candidates yet at this threshold — try lowering the match filter.
          </div>
        )}

        <div className="space-y-4">
          {ranked.map(({ candidate: c, score }) => {
            const days = freshnessDays(c.last_resume_upload_at);
            const u = unlocked[c.id];
            return (
              <div key={c.id} className="paper-card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-mono text-sm font-medium text-ink flex items-center gap-2">
                      {u?.full_name ?? c.candidate_code}
                      {u && (
                        <span className="text-[11px] font-mono uppercase tracking-wide text-verified">
                          Unlocked
                        </span>
                      )}
                    </p>
                    {u && (
                      <p className="text-xs text-ink-soft mt-0.5">
                        {u.email} {u.phone ? `· ${u.phone}` : ""}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-1 rounded-md ${
                      score >= 80
                        ? "bg-verified-soft text-verified"
                        : score >= 60
                        ? "bg-gold-soft text-gold-deep"
                        : "bg-alert-soft text-alert"
                    }`}
                  >
                    {score}% match
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3 text-xs items-center">
                  <Seal label="Integrity" confidence={c.integrity_score ?? 100} />
                  <span className="px-2 py-1 rounded-md bg-paper-deep text-ink-soft">
                    {c.availability_status ?? "Not specified"}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-paper-deep text-ink-soft">
                    {c.video_pitch_score ? `Video ${c.video_pitch_score}/100` : "Video not scored"}
                  </span>
                  <span className="px-2 py-1 rounded-md bg-paper-deep text-ink-soft">
                    {days !== null ? `Updated ${days}d ago` : "No recent activity"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(c.skills ?? []).slice(0, 6).map((s) => (
                    <span key={s} className="text-xs px-2 py-1 rounded-md bg-paper text-ink-soft">
                      {s}
                    </span>
                  ))}
                </div>

                {!u ? (
                  <Button loading={unlocking === c.id} onClick={() => handleUnlock(c.id)}>
                    Unlock candidate
                  </Button>
                ) : (
                  <Button variant="secondary">Request interview</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
