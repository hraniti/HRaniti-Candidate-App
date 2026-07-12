"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { calcCompleteness } from "@/lib/completeness";
import Button from "@/components/Button";
import AppHeader from "@/components/AppHeader";
import ReferralAttributionCatcher from "@/components/referrals/ReferralAttributionCatcher";
import { Sparkles, Video, ClipboardCheck, UserPlus, ArrowRight } from "lucide-react";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  career_track: string;
  skills: string[];
  applicant_count: number;
}

function scoreJob(profile: Profile, job: Job): number {
  const skillSet = new Set((profile.skills ?? []).map((s) => s.toLowerCase()));
  const overlap = (job.skills ?? []).filter((s) => skillSet.has(s.toLowerCase())).length;
  const trackMatch = profile.career_track === job.career_track ? 40 : 0;
  const skillScore = Math.min(50, overlap * 12);
  const base = 10;
  return Math.min(99, trackMatch + skillScore + base);
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [trending, setTrending] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p as Profile);

      const { data: jobsData } = await supabase.from("jobs").select("*").limit(50);
      setJobs((jobsData as Job[]) ?? []);
      setTrending(
        [...((jobsData as Job[]) ?? [])]
          .sort((a, b) => (b.applicant_count ?? 0) - (a.applicant_count ?? 0))
          .slice(0, 4)
      );

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center">
        <p className="font-mono text-sm text-ink-soft">Loading your dashboard…</p>
      </main>
    );
  }
  if (!profile) return null;

  const zeroData = !profile.resume_uploaded && !profile.preferences_completed;
  const strength = calcCompleteness(profile);
  const matched = zeroData
    ? []
    : jobs.map((j) => ({ job: j, score: scoreJob(profile, j) })).sort((a, b) => b.score - a.score).slice(0, 5);

  const checklist = [
    { label: "Upload Resume", done: profile.resume_uploaded, href: "/onboarding/resume", cta: "Add Now" },
    { label: "Verify Email", done: true, href: "#", cta: "" },
    { label: "Add Certifications", done: (profile.certifications ?? []).length > 0, href: "/onboarding/profile", cta: "Add Now" },
    { label: "Take Skill Assessment", done: false, href: "/interview-hub", cta: "Start Assessment" },
    { label: "Apply to First Job", done: false, href: "/jobs", cta: "Browse Jobs" },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;

  return (
    <main className="min-h-screen bg-paper px-4 py-10 sm:py-14">
      <ReferralAttributionCatcher />
      <div className="max-w-3xl mx-auto">
        <AppHeader />

        <h1 className="font-display text-3xl sm:text-4xl text-ink mb-1">
          Welcome to HRaniti, {profile.full_name?.split(" ")[0] ?? "there"}!
        </h1>
        <p className="text-ink-soft italic mb-1">Helping professionals build careers, not just find jobs.</p>
        <p className="text-ink-soft mb-8">
          {zeroData
            ? "Upload your resume to see your personalized matches!"
            : `We found ${matched.length} jobs that match your profile.`}
        </p>

        {/* Profile strength */}
        <section className="paper-card p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink">Profile Strength</p>
            <p className="font-mono text-sm text-ink">{strength}%</p>
          </div>
          <div className="h-2 w-full bg-line rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                strength >= 70 ? "bg-verified" : strength >= 40 ? "bg-gold" : "bg-alert"
              }`}
              style={{ width: `${strength}%` }}
            />
          </div>
          <p className="text-xs text-ink-soft">Complete your profile to receive better job matches.</p>
        </section>

        <div className="grid sm:grid-cols-5 gap-6">
          <div className="sm:col-span-3 space-y-6">
            {/* Jobs for you / zero data fallback */}
            <section className="paper-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-ink">{zeroData ? "Trending roles" : "Jobs for you"}</h2>
                <a href="/jobs" className="text-xs text-ink-soft underline underline-offset-4">View all matches</a>
              </div>

              {zeroData && (
                <div className="mb-4 bg-gold/10 border border-gold/40 rounded-lg p-3">
                  <p className="text-xs text-ink">
                    Upload your resume to see your personalized matches! In the meantime, here are our overall trending roles.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {(zeroData ? trending.map((j) => ({ job: j, score: null as number | null })) : matched).map(
                  ({ job, score }) => (
                    <button
                      key={job.id}
                      onClick={() => router.push(`/jobs/${job.id}`)}
                      className="w-full flex items-center justify-between border border-line rounded-lg px-4 py-3 hover:border-ink/40 text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{job.title}</p>
                        <p className="text-xs text-ink-soft">{job.company} · {job.location}</p>
                      </div>
                      {score !== null && (
                        <span className="font-mono text-xs text-verified">{score}% match</span>
                      )}
                    </button>
                  )
                )}
                {jobs.length === 0 && (
                  <p className="text-sm text-ink-soft italic">No roles listed yet — check back soon.</p>
                )}
              </div>

              {zeroData && (
                <Button className="w-full justify-center mt-4" onClick={() => router.push("/onboarding/resume")}>
                  Upload Resume Now
                </Button>
              )}
            </section>

            {/* AI recommendations */}
            <section className="paper-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-gold" />
                <h2 className="font-medium text-ink">AI recommendations</h2>
              </div>
              <div className="space-y-2">
                <button className="w-full text-left text-sm text-ink border border-line rounded-lg px-3 py-2 hover:border-ink/40 flex items-center justify-between">
                  Add Python skill to widen your matches <ArrowRight size={14} />
                </button>
                <button className="w-full text-left text-sm text-ink border border-line rounded-lg px-3 py-2 hover:border-ink/40 flex items-center justify-between">
                  Add Snowflake — improves matches by 23% <ArrowRight size={14} />
                </button>
              </div>
            </section>
          </div>

          <div className="sm:col-span-2 space-y-6">
            {/* Getting started checklist */}
            <section className="paper-card p-6">
              <h2 className="font-medium text-ink mb-1">Getting started</h2>
              <p className="text-xs text-ink-soft mb-4">{checklistDone}/{checklist.length} complete</p>
              <ul className="space-y-3">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center justify-between">
                    <span className={`text-sm flex items-center gap-2 ${c.done ? "text-ink-soft line-through" : "text-ink"}`}>
                      <ClipboardCheck size={14} className={c.done ? "text-verified" : "text-line"} />
                      {c.label}
                    </span>
                    {!c.done && c.cta && (
                      <a href={c.href} className="text-xs text-ink underline underline-offset-4 shrink-0">
                        {c.cta}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Career actions - contextual */}
            <section className="paper-card p-6">
              <h2 className="font-medium text-ink mb-3">Career actions</h2>
              <div className="space-y-2">
                {checklistDone / checklist.length >= 0.5 && (
                  <ActionRow icon={<Video size={14} />} label="Upload a video pitch" />
                )}
                <ActionRow icon={<ClipboardCheck size={14} />} label="Take a mock interview" />
                {checklist[4].done && <ActionRow icon={<UserPlus size={14} />} label="Refer a friend" />}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function ActionRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center gap-2 text-sm text-ink border border-line rounded-lg px-3 py-2 hover:border-ink/40">
      {icon} {label}
    </button>
  );
}
