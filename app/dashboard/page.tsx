"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile, Job } from "@/lib/types";
import { calcCompleteness } from "@/lib/completeness";
import { calcMatchScore, matchTier, gapNudge } from "@/lib/jobMatching";
import Button from "@/components/Button";
import CandidateShell from "@/components/CandidateShell";
import ReferralAttributionCatcher from "@/components/referrals/ReferralAttributionCatcher";
import MatchBadge from "@/components/jobs/MatchBadge";
import {
  Sparkles, ArrowRight, CheckCircle2, Video, ClipboardCheck, UserPlus,
  Briefcase, FileCheck, Bookmark, Award,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [trending, setTrending] = useState<Job[]>([]);
  const [applicationCount, setApplicationCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [assessmentCount, setAssessmentCount] = useState(0);
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

      const [{ count: apps }, { count: saved }, { count: assessments }] = await Promise.all([
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("saved_jobs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("assessment_results").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setApplicationCount(apps ?? 0);
      setSavedCount(saved ?? 0);
      setAssessmentCount(assessments ?? 0);

      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    : jobs.map((j) => ({ job: j, score: calcMatchScore(profile, j) })).sort((a, b) => b.score - a.score).slice(0, 5);

  const checklist = [
    { label: "Upload Resume", done: profile.resume_uploaded, href: "/onboarding/resume", cta: "Add Now" },
    { label: "Verify Email", done: true, href: "#", cta: "" },
    { label: "Add Certifications", done: (profile.certifications ?? []).length > 0, href: "/onboarding/profile", cta: "Add Now" },
    { label: "Take Skill Assessment", done: assessmentCount > 0, href: "/interview-hub", cta: "Start Assessment" },
    { label: "Apply to First Job", done: applicationCount > 0, href: "/jobs", cta: "Browse Jobs" },
  ];
  const checklistDone = checklist.filter((c) => c.done).length;

  const realNudges = zeroData
    ? []
    : Array.from(
        new Set(
          matched
            .map(({ job }) => gapNudge(profile, job))
            .filter((n): n is string => !!n)
        )
      ).slice(0, 2);

  return (
    <CandidateShell>
      <ReferralAttributionCatcher />
      <div className="px-6 sm:px-10 py-8 sm:py-10 max-w-5xl">
        <h1 className="font-display text-2xl sm:text-3xl text-ink mb-1">
          Welcome back, {profile.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
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
          <p className="text-xs text-ink-soft">
            Based on your resume, experience, skills, and preferences — separate from the action checklist below.
          </p>
        </section>

        {/* Real stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Briefcase} tone="violet" label="Jobs Matching You" value={matched.length} />
          <StatCard icon={FileCheck} tone="coral" label="Applications" value={applicationCount} />
          <StatCard icon={Bookmark} tone="cyan" label="Saved Jobs" value={savedCount} />
          <StatCard icon={Award} tone="gold" label="Assessments" value={assessmentCount} />
        </div>

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
                      className="w-full flex items-center justify-between border border-line rounded-lg px-4 py-3 hover:border-brandViolet/40 hover:bg-brandViolet-soft/30 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{job.title}</p>
                        <p className="text-xs text-ink-soft">{job.company} · {job.location}</p>
                      </div>
                      {score !== null && <MatchBadge tier={matchTier(score)} />}
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
                <Sparkles size={16} className="text-brandViolet" />
                <h2 className="font-medium text-ink">AI recommendations</h2>
              </div>
              <div className="space-y-2">
                {realNudges.length > 0 ? (
                  realNudges.map((nudge, i) => (
                    <button
                      key={i}
                      onClick={() => router.push("/profile")}
                      className="w-full text-left text-sm text-ink border border-line rounded-lg px-3 py-2 hover:border-brandViolet/40 flex items-center justify-between"
                    >
                      {nudge} <ArrowRight size={14} />
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-ink-soft inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-verified" />
                    {zeroData ? "Upload your resume to get personalized recommendations." : "Your profile is in great shape for your current matches."}
                  </p>
                )}
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
                      <a href={c.href} className="text-xs text-brandViolet underline underline-offset-4 shrink-0">
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
                  <ActionRow icon={<Video size={14} />} label="Upload a video pitch" href="/interview-hub/video-pitch" />
                )}
                <ActionRow icon={<ClipboardCheck size={14} />} label="Take a mock interview" href="/interview-hub/mock-interview" />
                {checklist[4].done && <ActionRow icon={<UserPlus size={14} />} label="Refer a friend" href="/referrals/refer" />}
              </div>
            </section>
          </div>
        </div>
      </div>
    </CandidateShell>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: typeof Briefcase;
  tone: "violet" | "coral" | "cyan" | "gold";
  label: string;
  value: number;
}) {
  const toneMap = {
    violet: { bg: "bg-brandViolet-soft", text: "text-brandViolet" },
    coral: { bg: "bg-brandCoral-soft", text: "text-brandCoral" },
    cyan: { bg: "bg-brandCyan-soft", text: "text-brandCyan-deep" },
    gold: { bg: "bg-gold-soft", text: "text-gold-deep" },
  };
  const t = toneMap[tone];
  return (
    <div className="paper-card p-4">
      <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center mb-3`}>
        <Icon size={17} className={t.text} />
      </div>
      <p className="font-display text-2xl text-ink mb-0.5">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}

function ActionRow({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      className="w-full flex items-center gap-2 text-sm text-ink border border-line rounded-lg px-3 py-2 hover:border-brandViolet/40 hover:bg-brandViolet-soft/30 transition-colors"
    >
      {icon} {label}
    </a>
  );
}
