"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, AssessmentResultFull } from "@/lib/types";
import AIInterviewSession from "@/components/interview-hub/AIInterviewSession";
import Button from "@/components/Button";
import { CheckCircle2, Clock, Lock, Sparkles, ChevronDown } from "lucide-react";

const MAX_ATTEMPTS = 3;

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export default function AssessmentsPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<AssessmentResultFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AssessmentResultFull | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState<AssessmentResultFull | null>(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("assessment_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("assessment_type", "AI Interview")
        .order("completed_at", { ascending: false }),
    ]);
    setProfile(p as Profile);
    setResults((r as AssessmentResultFull[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function startOrResume() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-interview/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActive(data.result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  if (active) {
    return (
      <AIInterviewSession
        result={active}
        onFinished={(updated) => {
          setActive(null);
          setJustCompleted(updated);
          load();
          setTimeout(() => setJustCompleted(null), 8000);
        }}
      />
    );
  }

  const completed = results.filter((r) => r.report?.status === "completed");
  const inProgress = results.find((r) => r.report?.status === "in_progress");
  const latest = completed[0] ?? null;
  const attemptsUsed = completed.length;
  const attemptsLeft = MAX_ATTEMPTS - attemptsUsed;

  return (
    <div>
      {justCompleted?.report.scores && (
        <div className="bg-verified/10 border border-verified/30 text-verified text-sm rounded-lg px-4 py-3 mb-4">
          Interview complete — overall score {justCompleted.report.scores.overall}%. Valid for 180 days.
        </div>
      )}

      <section className="paper-card p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-ink">AI Interview</h2>
          <span className="text-xs font-mono text-ink-soft">{attemptsUsed}/{MAX_ATTEMPTS} attempts used</span>
        </div>
        <p className="text-xs text-ink-soft mb-4">
          One recorded session — 7 questions covering your resume, technical skills, behavioural situations, and a
          hypothetical scenario. About 15 minutes. Scored across four dimensions.
        </p>

        {error && <p className="text-sm text-alert mb-3">{error}</p>}

        {inProgress && (
          <Button loading={starting} onClick={startOrResume}>
            <Sparkles size={14} className="text-gold" /> Resume Interview
          </Button>
        )}

        {!inProgress && latest && (
          <div className="mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
              <ScoreTile label="Overall" value={latest.report.scores?.overall} highlight />
              <ScoreTile label="Technical" value={latest.report.scores?.technical} />
              <ScoreTile label="Behavioural" value={latest.report.scores?.behavioural} />
              <ScoreTile label="Communication" value={latest.report.scores?.communication} />
              <ScoreTile label="Specificity" value={latest.report.scores?.specificity} />
            </div>
            {latest.valid_until && (
              <p className="text-xs text-ink-soft inline-flex items-center gap-1 mb-3">
                <Clock size={12} /> Valid for {daysUntil(latest.valid_until)} more days
              </p>
            )}
          </div>
        )}

        {!inProgress && (attemptsLeft > 0 ? (
          <Button loading={starting} onClick={startOrResume}>
            <Sparkles size={14} className="text-gold" /> {latest ? "Retake Interview" : "Start Interview"}
          </Button>
        ) : (
          <p className="text-sm text-ink-soft inline-flex items-center gap-1.5">
            <Lock size={14} /> You've used all {MAX_ATTEMPTS} attempts for this interview.
          </p>
        ))}
      </section>

      {completed.length > 0 && (
        <section className="paper-card p-6">
          <h2 className="font-medium text-ink mb-3">Interview History</h2>
          <div className="space-y-2">
            {completed.map((r) => (
              <div key={r.id} className="border-b border-line last:border-0 py-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-ink font-medium">Attempt {r.report.attempt_number}</p>
                    <p className="text-xs text-ink-soft">{new Date(r.completed_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-ink">{r.score}%</p>
                    <p className="text-xs text-verified inline-flex items-center gap-1">
                      <CheckCircle2 size={11} /> Completed
                    </p>
                  </div>
                </div>
                {r.report.notes && r.report.notes.length > 0 && (
                  <button
                    onClick={() => setExpandedNotes(expandedNotes === r.id ? null : r.id)}
                    className="text-xs text-ink underline underline-offset-4 inline-flex items-center gap-1 mt-1"
                  >
                    <ChevronDown size={11} className={expandedNotes === r.id ? "rotate-180" : ""} /> View feedback
                  </button>
                )}
                {expandedNotes === r.id && (
                  <div className="mt-2 space-y-1.5">
                    {r.report.notes!.map((n, i) => (
                      <p key={i} className="text-xs text-ink-soft bg-paper rounded-lg p-2">{n.observation}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreTile({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-2 py-2.5 text-center ${highlight ? "bg-ink text-white" : "bg-paper text-ink"}`}>
      <p className={`font-mono text-lg ${highlight ? "text-white" : "text-ink"}`}>{value ?? "—"}%</p>
      <p className={`text-[10px] ${highlight ? "text-white/70" : "text-ink-soft"}`}>{label}</p>
    </div>
  );
}
