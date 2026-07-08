"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, AssessmentResultFull, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/lib/types";
import { checkAssessmentEligibility, daysUntil } from "@/lib/assessmentEligibility";
import AssessmentTaker from "@/components/interview-hub/AssessmentTaker";
import Button from "@/components/Button";
import { CheckCircle2, Clock, Lock, Sparkles } from "lucide-react";

type AssessmentKind = "Domain" | "Behavioural" | "Language";

export default function AssessmentsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<AssessmentResultFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState<{ type: AssessmentKind; track?: string; language?: string } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>("English");
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("assessment_results").select("*").eq("user_id", user.id),
    ]);
    setProfile(p as Profile);
    setResults((r as AssessmentResultFull[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  const domainResults = results.filter((r) => r.assessment_type === "Domain" && r.career_track === profile.career_track);
  const behaviouralResults = results.filter((r) => r.assessment_type === "Behavioural");
  const languageResults = results.filter((r) => r.assessment_type === "Language" && r.language === selectedLanguage);

  const domainStatus = checkAssessmentEligibility(domainResults);
  const behaviouralStatus = checkAssessmentEligibility(behaviouralResults);
  const languageStatus = checkAssessmentEligibility(languageResults);

  return (
    <div>
      {justCompleted && (
        <div className="bg-verified/10 border border-verified/30 text-verified text-sm rounded-lg px-4 py-3 mb-4">
          {justCompleted}
        </div>
      )}

      <AssessmentCard
        title="Domain Assessment"
        subtitle={profile.career_track ? `Tailored to ${profile.career_track}` : "Set your career track in My Profile first"}
        status={domainStatus}
        disabled={!profile.career_track}
        onStart={() => setTaking({ type: "Domain", track: profile.career_track ?? undefined })}
      />

      <AssessmentCard
        title="Behavioural Assessment"
        subtitle="Discover your work style and leadership preferences"
        status={behaviouralStatus}
        onStart={() => setTaking({ type: "Behavioural" })}
      />

      <section className="paper-card p-6 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="font-medium text-ink">Language Assessment</h2>
            <p className="text-xs text-ink-soft">Verify written and spoken proficiency</p>
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
            className="rounded-lg border border-line px-2 py-1.5 text-sm bg-white"
          >
            {SUPPORTED_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <StatusRow status={languageStatus} onStart={() => setTaking({ type: "Language", language: selectedLanguage })} />
        {languageStatus.latestResult?.tier && (
          <p className="text-xs text-ink-soft mt-2 font-mono">CEFR Tier: {languageStatus.latestResult.tier}</p>
        )}
      </section>

      {/* Assessment History */}
      {results.length > 0 && (
        <section className="paper-card p-6">
          <h2 className="font-medium text-ink mb-3">Assessment History</h2>
          <div className="space-y-2">
            {[...results]
              .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-line last:border-0 py-2">
                  <div>
                    <p className="text-ink font-medium">
                      {r.assessment_type}
                      {r.career_track ? ` — ${r.career_track}` : ""}
                      {r.language ? ` — ${r.language}` : ""}
                    </p>
                    <p className="text-xs text-ink-soft">{new Date(r.completed_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-ink font-mono text-xs">{r.tier ?? `${r.score}%`}</p>
                    <p className={`text-xs ${r.passed ? "text-verified" : "text-alert"}`}>
                      {r.passed ? "Completed" : "Below threshold"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {taking && (
        <AssessmentTaker
          type={taking.type}
          track={taking.track}
          language={taking.language}
          onClose={() => setTaking(null)}
          onComplete={(result) => {
            setTaking(null);
            setJustCompleted(
              taking.type === "Behavioural"
                ? "Behavioural assessment completed — your profile is updated."
                : result.passed
                ? `Passed with ${result.tier ?? result.score + "%"}! Valid for 180 days.`
                : `Scored ${result.score}%. You can retake this in 30 days.`
            );
            load();
            setTimeout(() => setJustCompleted(null), 6000);
          }}
        />
      )}
    </div>
  );
}

function AssessmentCard({
  title,
  subtitle,
  status,
  disabled,
  onStart,
}: {
  title: string;
  subtitle: string;
  status: ReturnType<typeof checkAssessmentEligibility>;
  disabled?: boolean;
  onStart: () => void;
}) {
  return (
    <section className="paper-card p-6 mb-4">
      <div className="mb-3">
        <h2 className="font-medium text-ink">{title}</h2>
        <p className="text-xs text-ink-soft">{subtitle}</p>
      </div>
      <StatusRow status={status} onStart={onStart} disabled={disabled} />
    </section>
  );
}

function StatusRow({
  status,
  onStart,
  disabled,
}: {
  status: ReturnType<typeof checkAssessmentEligibility>;
  onStart: () => void;
  disabled?: boolean;
}) {
  if (status.reason === "valid_reuse" && status.latestResult) {
    return (
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm text-verified">
          <CheckCircle2 size={15} /> Passed — {status.latestResult.score}%
          {status.latestResult.valid_until && ` · valid ${daysUntil(status.latestResult.valid_until)} more days`}
        </span>
      </div>
    );
  }
  if (status.reason === "cooldown" && status.cooldownEndsAt) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-ink-soft">
        <Lock size={14} /> Retake available in {daysUntil(status.cooldownEndsAt)} day(s)
      </div>
    );
  }
  return (
    <Button disabled={disabled} onClick={onStart}>
      <Sparkles size={14} className="text-gold" /> Start Assessment
    </Button>
  );
}
