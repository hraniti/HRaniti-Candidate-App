"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, MockInterviewResult, Difficulty } from "@/lib/types";
import Button from "@/components/Button";
import { Lock, Mic, Square, SkipForward, Clock, Eye, ChevronRight } from "lucide-react";

type InterviewType = "Technical" | "Behavioural" | "Cultural" | "Communication" | "Case";

const INTERVIEW_TYPES: InterviewType[] = ["Technical", "Behavioural", "Cultural", "Communication", "Case"];
const LANGUAGES = ["English", "French", "German", "Spanish", "Hindi", "Arabic", "Mandarin"];

type ViewState = "setup" | "session" | "feedback";

export default function MockInterviewPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [past, setPast] = useState<MockInterviewResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("setup");
  const [active, setActive] = useState<MockInterviewResult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Setup form state
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [language, setLanguage] = useState("English");
  const [types, setTypes] = useState<InterviewType[]>(["Technical"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("Intermediate");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: interviews }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("mock_interview_results").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(p as Profile);
      setPast((interviews as MockInterviewResult[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function startInterview() {
    setStarting(true);
    setError(null);
    const form = new FormData();
    if (jdFile) form.append("jobDescriptionFile", jdFile);
    form.append("jobDescriptionText", jdText);
    form.append("companyName", companyName);
    form.append("language", language);
    form.append("difficulty", difficulty);
    form.append("interviewTypes", JSON.stringify(types));

    try {
      const res = await fetch("/api/mock-interview/start", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActive(data.interview);
      setView("session");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  const isPaid = profile.subscription_tier === "paid";

  if (view === "session" && active) {
    return (
      <InterviewSession
        interview={active}
        onFinished={(updated) => {
          setActive(updated);
          setPast((prev) => [updated, ...prev.filter((p) => p.id !== updated.id)]);
          setView("feedback");
        }}
      />
    );
  }

  if (view === "feedback" && active?.feedback) {
    return <FeedbackView interview={active} onBack={() => { setView("setup"); setActive(null); }} />;
  }

  return (
    <div>
      {!isPaid && (
        <div className="paper-card p-5 mb-6 border-gold/50 bg-gold/5">
          <p className="text-sm font-medium text-ink mb-1">Mock Interview is a paid feature</p>
          <p className="text-xs text-ink-soft">Unlimited AI-powered practice interviews with proctoring and detailed feedback — ₹999/month.</p>
        </div>
      )}

      <section className={`paper-card p-6 mb-6 ${!isPaid ? "opacity-60 pointer-events-none" : ""}`}>
        <h2 className="font-medium text-ink mb-4">Set up your mock interview</h2>

        <div className="mb-4">
          <label className="text-xs font-medium text-ink-soft">Job description</label>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the job description here…"
            rows={4}
            className="w-full mt-1 rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-ink-soft">or upload a file:</span>
            <input type="file" accept=".pdf,.docx" onChange={(e) => setJdFile(e.target.files?.[0] ?? null)} className="text-xs" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium text-ink-soft">Company name</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full mt-1 rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-soft">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full mt-1 rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
            >
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-ink-soft block mb-2">Interview type</label>
          <div className="flex flex-wrap gap-2">
            {INTERVIEW_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
                className={`text-sm px-3.5 py-1.5 rounded-full border ${
                  types.includes(t) ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-ink-soft">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="w-full mt-1 rounded-lg border border-line px-3 py-2.5 text-sm bg-white"
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>

        {error && <p className="text-sm text-alert mb-3">{error}</p>}
        <Button className="w-full justify-center" loading={starting} disabled={!isPaid} onClick={startInterview}>
          {isPaid ? "Start Interview" : <><Lock size={14} /> Upgrade to start</>}
        </Button>
      </section>

      {past.length > 0 && (
        <section className="paper-card p-6">
          <h2 className="font-medium text-ink mb-3">Past Interviews</h2>
          <div className="space-y-2">
            {past.map((i) => (
              <div key={i.id} className="border-b border-line last:border-0 py-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-ink font-medium">{i.interview_types.join(", ")}</p>
                    <p className="text-xs text-ink-soft">
                      {new Date(i.created_at).toLocaleDateString()}
                      {i.duration_seconds ? ` · ${Math.round(i.duration_seconds / 60)} min` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    {i.score != null && <p className="font-mono text-ink">{i.score}%</p>}
                    <p className="text-xs text-ink-soft">{i.status}</p>
                  </div>
                </div>
                {i.status === "Completed" && i.feedback && (
                  <button
                    onClick={() => { setActive(i); setView("feedback"); }}
                    className="text-xs text-ink underline underline-offset-4 inline-flex items-center gap-1 mt-1"
                  >
                    <Eye size={11} /> View full feedback report
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InterviewSession({
  interview,
  onFinished,
}: {
  interview: MockInterviewResult;
  onFinished: (updated: MockInterviewResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [transcript, setTranscript] = useState<{ question: string; answer: string; skipped: boolean }[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(interview.difficulty === "Advanced" ? 90 : null);
  const [submitting, setSubmitting] = useState(false);
  const startTime = useRef(Date.now());
  const proctoring = useRef({ tab_switches: 0, copy_paste_events: 0 });
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const question = interview.questions[index];

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) proctoring.current.tab_switches++;
    }
    function onCopyPaste() {
      proctoring.current.copy_paste_events++;
    }
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopyPaste);
    document.addEventListener("paste", onCopyPaste);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopyPaste);
      document.removeEventListener("paste", onCopyPaste);
    };
  }, []);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      advance(false);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  async function toggleRecording() {
    if (recording) {
      mediaRecorder.current?.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunks.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setTranscribing(true);
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      const res = await fetch("/api/mock-interview/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (data.text) setAnswer((prev) => (prev ? prev + " " + data.text : data.text));
      setTranscribing(false);
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
  }

  async function advance(skipped: boolean) {
    const entry = { question: question.question, answer: skipped ? "" : answer, skipped };
    const nextTranscript = [...transcript, entry];
    setTranscript(nextTranscript);
    setAnswer("");
    setTimeLeft(interview.difficulty === "Advanced" ? 90 : null);

    if (index + 1 < interview.questions.length) {
      setIndex(index + 1);
    } else {
      setSubmitting(true);
      const durationSeconds = Math.round((Date.now() - startTime.current) / 1000);
      const res = await fetch("/api/mock-interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: interview.id,
          transcript: nextTranscript,
          durationSeconds,
          proctoringFlags: proctoring.current,
        }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (data.interview) onFinished(data.interview);
    }
  }

  if (submitting) {
    return <p className="font-mono text-sm text-ink-soft text-center py-16">Generating your feedback report…</p>;
  }

  return (
    <section className="paper-card p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-ink-soft">Question {index + 1} of {interview.questions.length}</span>
        {timeLeft !== null && (
          <span className="inline-flex items-center gap-1 text-xs font-mono text-alert">
            <Clock size={12} /> {timeLeft}s
          </span>
        )}
      </div>
      <p className="text-[11px] text-ink-soft mb-2">{question.type}</p>
      <p className="text-lg text-ink mb-5 font-display">{question.question}</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer, or record it below…"
        rows={5}
        className="w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none mb-3"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={toggleRecording}
          disabled={transcribing}
          className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${
            recording ? "bg-alert text-white border-alert" : "bg-white text-ink border-line"
          }`}
        >
          {recording ? <Square size={13} /> : <Mic size={13} />}
          {recording ? "Stop" : transcribing ? "Transcribing…" : "Record answer"}
        </button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => advance(true)}>
            <SkipForward size={13} /> Skip
          </Button>
          <Button onClick={() => advance(false)} disabled={!answer.trim()}>
            {index + 1 < interview.questions.length ? "Next" : "Finish"} <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeedbackView({ interview, onBack }: { interview: MockInterviewResult; onBack: () => void }) {
  const f = interview.feedback!;
  return (
    <div>
      <button onClick={onBack} className="text-sm text-ink-soft mb-4 hover:text-ink">← Back</button>
      <section className="paper-card p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-ink">Overall Score</h2>
          <span className="font-mono text-2xl text-ink">{f.overall_score}%</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(f.breakdown).map(([type, score]) => (
            <div key={type} className="bg-paper rounded-lg px-3 py-2">
              <p className="text-xs text-ink-soft">{type}</p>
              <p className="font-mono text-sm text-ink">{score}%</p>
            </div>
          ))}
        </div>
      </section>

      <section className="paper-card p-6 mb-4">
        <h2 className="font-medium text-ink mb-3">Per-question feedback</h2>
        <div className="space-y-4">
          {f.per_question.map((pq, i) => (
            <div key={i} className="border-b border-line last:border-0 pb-3">
              <p className="text-sm font-medium text-ink mb-1">{pq.question}</p>
              <p className="text-xs text-verified mb-0.5">✓ {pq.strong}</p>
              <p className="text-xs text-alert mb-0.5">△ {pq.weak}</p>
              <p className="text-xs text-ink-soft">💡 {pq.suggestion}</p>
            </div>
          ))}
        </div>
      </section>

      {f.resources?.length > 0 && (
        <section className="paper-card p-6 mb-4">
          <h2 className="font-medium text-ink mb-2">Suggested resources</h2>
          <ul className="text-sm text-ink-soft space-y-1">
            {f.resources.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </section>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack}>Retake this interview</Button>
      </div>
    </div>
  );
}
