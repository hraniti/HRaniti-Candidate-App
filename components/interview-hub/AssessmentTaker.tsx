"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/Button";
import { Mic, Square, X, CheckCircle2 } from "lucide-react";

type AssessmentKind = "Domain" | "Behavioural" | "Language";

interface Question {
  id: string;
  question: string;
  options: string[];
}

export default function AssessmentTaker({
  type,
  track,
  language,
  onClose,
  onComplete,
}: {
  type: AssessmentKind;
  track?: string;
  language?: string;
  onClose: () => void;
  onComplete: (result: any) => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [spokenPrompt, setSpokenPrompt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({ type });
      if (track) params.set("track", track);
      if (language) params.set("language", language);
      const res = await fetch(`/api/assessments/questions?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setQuestions(data.questions ?? []);
        setSpokenPrompt(data.spokenPrompt ?? null);
      }
      setLoading(false);
    })();
  }, [type, track, language]);

  async function toggleRecording() {
    if (recording) {
      mediaRecorder.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.current.push(e.data);
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunks.current, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch {
      setError("Couldn't access your microphone. Check your browser permissions.");
    }
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (type === "Language") {
        const form = new FormData();
        form.append("language", language ?? "");
        form.append("answers", JSON.stringify(questions.map((q) => answers[q.id])));
        if (audioBlob) form.append("audio", audioBlob, "response.webm");
        const res = await fetch("/api/assessments/language", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onComplete(data.result);
      } else {
        const res = await fetch("/api/assessments/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, careerTrack: track, answers: questions.map((q) => answers[q.id]) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onComplete(data.result);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-white rounded-card max-w-lg w-full p-6 relative my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-ink-soft hover:text-ink">
          <X size={18} />
        </button>
        <h3 className="font-display text-xl text-ink mb-1">
          {type} Assessment{track ? ` — ${track}` : ""}{language ? ` — ${language}` : ""}
        </h3>
        <p className="text-sm text-ink-soft mb-5">
          {type === "Behavioural" ? "There are no right or wrong answers — answer honestly." : "Passing score: 80%. Take your time."}
        </p>

        {loading && <p className="font-mono text-sm text-ink-soft">Loading questions…</p>}
        {error && <p className="text-sm text-alert mb-4">{error}</p>}

        {!loading && questions.length > 0 && (
          <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1 mb-5">
            {questions.map((q, i) => (
              <div key={q.id}>
                <p className="text-sm font-medium text-ink mb-2">{i + 1}. {q.question}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === idx}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {type === "Language" && spokenPrompt && !loading && (
          <div className="paper-card p-4 mb-5">
            <p className="text-xs font-medium text-ink-soft mb-1">Spoken section (optional, improves accuracy)</p>
            <p className="text-sm text-ink mb-3">"{spokenPrompt}"</p>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleRecording}
                className={`inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border ${
                  recording ? "bg-alert text-white border-alert" : "bg-white text-ink border-line"
                }`}
              >
                {recording ? <Square size={13} /> : <Mic size={13} />}
                {recording ? "Stop recording" : "Record response"}
              </button>
              {audioBlob && !recording && (
                <span className="inline-flex items-center gap-1 text-xs text-verified">
                  <CheckCircle2 size={13} /> Recorded
                </span>
              )}
            </div>
          </div>
        )}

        {!loading && questions.length > 0 && (
          <Button className="w-full justify-center" disabled={!allAnswered} loading={submitting} onClick={submit}>
            Submit Assessment
          </Button>
        )}
      </div>
    </div>
  );
}
