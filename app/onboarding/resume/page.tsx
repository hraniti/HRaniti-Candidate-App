"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import { UploadCloud, FileText } from "lucide-react";

const STAGES = [
  "Reading your experience…",
  "Finding your skills…",
  "Understanding your career…",
  "Matching jobs…",
  "Almost ready!",
];

export default function ResumeUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parsing) return;
    if (stage >= STAGES.length - 1) return;
    const t = setTimeout(() => setStage((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [parsing, stage]);

  const upload = useCallback(async (f: File) => {
    setError(null);
    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(f.type)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("That file is larger than 10MB.");
      return;
    }
    setFile(f);
    setParsing(true);
    setStage(0);

    const body = new FormData();
    body.append("file", f);

    try {
      const res = await fetch("/api/parse-resume", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong parsing your resume.");
      setStage(STAGES.length - 1);
      setTimeout(() => router.push("/onboarding/profile"), 600);
    } catch (e: any) {
      setParsing(false);
      setError(e.message);
    }
  }, [router]);

  return (
    <StepShell
      title="Upload your resume — we'll do the rest"
      subtitle="AI will extract your skills, experience, and education. No typing required."
    >
      {!parsing ? (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) upload(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-card border-2 border-dashed ${dragOver ? "border-ink bg-paper" : "border-line"} py-10 px-4 text-center transition-colors`}
          >
            <UploadCloud className="mx-auto mb-3 text-ink-soft" size={28} />
            <p className="text-sm font-medium text-ink">Drag & drop your resume</p>
            <p className="text-xs text-ink-soft mt-1">PDF or DOCX, up to 10MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
          </div>

          {error && <p className="text-sm text-alert mt-4">{error}</p>}

          <div className="my-5 dashed-divider" />

          <Button variant="secondary" className="w-full justify-center" disabled>
            Or import from LinkedIn
          </Button>
          <p className="text-[11px] text-ink-soft text-center mt-2">
            LinkedIn's API restricts automatic import — paste your profile URL instead once you're on your profile page.
          </p>

          <button
            onClick={() => router.push("/onboarding/preferences")}
            className="block mx-auto mt-6 text-sm text-ink-soft underline underline-offset-4"
          >
            Skip for now — complete profile later
          </button>
        </>
      ) : (
        <div className="text-center py-6">
          <FileText className="mx-auto mb-4 text-verified" size={28} />
          <p className="text-sm font-medium text-ink mb-1">{file?.name}</p>
          <p className="text-xs text-ink-soft mb-6">
            {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}
          </p>

          <div className="h-1.5 w-full bg-line rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-verified transition-all duration-700"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
          <p className="font-mono text-sm text-ink">{STAGES[stage]}</p>

          {error && (
            <div className="mt-6">
              <p className="text-sm text-alert mb-3">{error}</p>
              <Button variant="secondary" onClick={() => setParsing(false)}>
                Try again
              </Button>
            </div>
          )}
        </div>
      )}
    </StepShell>
  );
}
