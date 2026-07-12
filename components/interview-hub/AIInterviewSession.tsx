"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AssessmentResultFull, AIInterviewTranscriptEntry } from "@/lib/types";
import Button from "@/components/Button";
import { Video, Square, SkipForward, ChevronRight, Loader2 } from "lucide-react";

export default function AIInterviewSession({
  result,
  onFinished,
}: {
  result: AssessmentResultFull;
  onFinished: (updated: AssessmentResultFull) => void;
}) {
  const supabase = createClient();
  const [index, setIndex] = useState(result.report.transcript.length);
  const [transcript, setTranscript] = useState<AIInterviewTranscriptEntry[]>(result.report.transcript);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [answerPreview, setAnswerPreview] = useState<{ text: string; videoUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const questions = result.report.questions;
  const question = questions[index];
  const showingFollowUp = useRef(false);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      chunks.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => chunks.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: "video/webm" });
        await processAnswer(blob);
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch {
      setError("Couldn't access your camera/microphone. Check browser permissions.");
    }
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  async function processAnswer(blob: Blob) {
    setProcessing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const path = `${user.id}/${result.id}/${question.id}.webm`;
      await supabase.storage.from("interview-media").upload(path, blob, { upsert: true, contentType: "video/webm" });
      const { data: signed } = await supabase.storage.from("interview-media").createSignedUrl(path, 60 * 60 * 24 * 365);

      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      const res = await fetch("/api/mock-interview/transcribe", { method: "POST", body: form });
      const data = await res.json();

      setAnswerPreview({ text: data.text ?? "", videoUrl: signed?.signedUrl ?? path });
    } catch {
      setError("Couldn't process that recording. Try again.");
    } finally {
      setProcessing(false);
    }
  }

  function confirmAndAdvance() {
    const entry: AIInterviewTranscriptEntry = {
      questionId: question.id,
      question: question.question,
      followUp: question.followUp,
      answer: answerPreview?.text ?? "",
      videoUrl: answerPreview?.videoUrl ?? null,
      skipped: false,
    };
    advance(entry);
  }

  function skip() {
    advance({
      questionId: question.id,
      question: question.question,
      followUp: question.followUp,
      answer: "",
      videoUrl: null,
      skipped: true,
    });
  }

  async function advance(entry: AIInterviewTranscriptEntry) {
    const next = [...transcript, entry];
    setTranscript(next);
    setAnswerPreview(null);

    if (index + 1 < questions.length) {
      setIndex(index + 1);
    } else {
      setSubmitting(true);
      const res = await fetch("/api/ai-interview/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: result.id, transcript: next }),
      });
      const data = await res.json();
      setSubmitting(false);
      if (data.result) onFinished(data.result);
      else setError(data.error ?? "Couldn't finish your interview.");
    }
  }

  if (submitting) {
    return <p className="font-mono text-sm text-ink-soft text-center py-16">Scoring your interview…</p>;
  }

  return (
    <section className="paper-card p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-ink-soft">Question {index + 1} of {questions.length}</span>
        <span className="text-[11px] font-mono bg-paper rounded-full px-2 py-0.5 text-ink-soft">{question.category}</span>
      </div>

      <p className="text-lg text-ink font-display mb-2">{question.question}</p>
      <p className="text-sm text-ink-soft italic mb-5">Follow-up to address too: {question.followUp}</p>

      {error && <p className="text-sm text-alert mb-3">{error}</p>}

      {!answerPreview ? (
        <>
          <video ref={videoRef} className="w-full rounded-lg bg-ink aspect-video mb-4" />
          <div className="flex items-center gap-3">
            {!recording ? (
              <Button onClick={startRecording} disabled={processing}>
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
                {processing ? "Processing…" : "Start Recording"}
              </Button>
            ) : (
              <Button className="!bg-alert" onClick={stopRecording}>
                <Square size={14} /> Stop
              </Button>
            )}
            <Button variant="ghost" onClick={skip} disabled={recording || processing}>
              <SkipForward size={13} /> Skip
            </Button>
          </div>
        </>
      ) : (
        <>
          <video src={answerPreview.videoUrl} controls className="w-full rounded-lg bg-ink aspect-video mb-4" />
          <p className="text-xs text-ink-soft bg-paper rounded-lg p-3 mb-4">
            Transcribed: {answerPreview.text || "(no speech detected — you can still continue)"}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAnswerPreview(null)}>Re-record</Button>
            <Button onClick={confirmAndAdvance}>
              {index + 1 < questions.length ? "Next question" : "Finish interview"} <ChevronRight size={14} />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
