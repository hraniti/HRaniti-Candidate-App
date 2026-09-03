"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import {
  UploadCloud,
  FileText,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
} from "lucide-react";

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

  const upload = useCallback(
    async (f: File) => {
      setError(null);
      if (
        !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(
          f.type
        )
      ) {
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
    },
    [router]
  );

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "100vh" }}>
      {/* Left — brand panel, matches the signup page */}
      <div className="relative flex flex-col justify-between overflow-hidden text-white" style={{ padding: "80px" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#4338CA] via-[#4A5CE0] to-[#38BDF8]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-96 w-[130%] rounded-[50%] bg-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-40 left-1/2 h-2 w-2 rounded-full bg-white/50"
        />

        <div className="relative">
          <div className="flex items-center gap-2" style={{ height: "42px" }}>
            <img src="/brand/logo-icon.png" alt="" style={{ height: "40px", width: "auto" }} />
            <span style={{ fontWeight: 700, fontSize: "22px", lineHeight: 1 }}>HRaniti</span>
          </div>
          <p style={{ fontSize: "14px", fontWeight: 400, color: "rgba(255,255,255,0.65)", marginTop: "4px" }}>
            Where change begins
          </p>
        </div>

        <div className="relative max-w-md">
          <h1 style={{ fontWeight: 700, fontSize: "40px", lineHeight: 1.15, marginBottom: "20px" }}>
            Upload your resume — <span className="text-cyan-300">we&rsquo;ll do the rest.</span>
          </h1>
          <p style={{ fontWeight: 400, fontSize: "18px", lineHeight: 1.6, color: "rgba(255,255,255,0.8)", marginBottom: "40px" }}>
            Our AI will extract your skills, experience, and education. No typing required.
          </p>

          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>AI-powered profile building</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  We automatically extract and organize your professional information.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Accurate & secure</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Your data is private, encrypted, and never shared without your permission.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Faster job matches</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Get matched with relevant opportunities that fit your skills and goals.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div />
      </div>

      {/* Right — upload card */}
      <div className="relative flex flex-col bg-paper" style={{ padding: "48px 72px" }}>
        <p
          className="absolute"
          style={{ top: "32px", right: "48px", fontWeight: 400, fontSize: "14px", lineHeight: 1, color: "#3A4460" }}
        >
          Step 1 of 5
        </p>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full" style={{ maxWidth: "580px" }}>
            {!parsing ? (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) upload(f);
                  }}
                  className={`rounded-2xl border-2 border-dashed text-center transition-colors ${
                    dragOver ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-line bg-white"
                  }`}
                  style={{ padding: "56px 32px" }}
                >
                  <div
                    className="mx-auto mb-5 rounded-full flex items-center justify-center"
                    style={{ height: "64px", width: "64px", background: "rgba(79,70,229,0.08)" }}
                  >
                    <UploadCloud size={28} color="#4F46E5" />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: "18px", color: "#16213E", marginBottom: "18px" }}>
                    Drag &amp; drop your resume here
                  </p>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-line" />
                    <span style={{ fontSize: "13px", color: "#8A93A6" }}>or</span>
                    <div className="h-px flex-1 bg-line" />
                  </div>

                  <button
                    onClick={() => inputRef.current?.click()}
                    className="rounded-lg text-white transition-all hover:opacity-90"
                    style={{
                      fontWeight: 600,
                      fontSize: "15px",
                      padding: "12px 28px",
                      background: "linear-gradient(90deg, #4F46E5, #38BDF8)",
                    }}
                  >
                    Browse files
                  </button>
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

                  <p style={{ fontSize: "13px", color: "#8A93A6", marginTop: "14px" }}>PDF or DOCX &bull; Max 10 MB</p>
                </div>

                {error && (
                  <p className="text-center" style={{ fontSize: "13px", color: "#B54430", marginTop: "16px" }}>
                    {error}
                  </p>
                )}

                <div
                  className="flex items-start gap-3 rounded-lg"
                  style={{ marginTop: "24px", padding: "16px", background: "#F3F4F6" }}
                >
                  <Lock size={16} color="#4F46E5" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "14px", color: "#16213E" }}>
                      Your resume is private and secure.
                    </p>
                    <p style={{ fontWeight: 400, fontSize: "13px", color: "#3A4460", marginTop: "2px" }}>
                      It&rsquo;s only used to create your HRaniti profile and improve your job matches.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/onboarding/preferences")}
                  className="block mx-auto"
                  style={{ marginTop: "24px", fontSize: "14px", fontWeight: 600, color: "#4F46E5" }}
                >
                  Skip for now →
                </button>
                <p className="text-center" style={{ fontSize: "13px", color: "#8A93A6", marginTop: "4px" }}>
                  You can complete your profile anytime.
                </p>
              </>
            ) : (
              <div className="text-center paper-card" style={{ padding: "48px 32px" }}>
                <FileText className="mx-auto mb-4 text-verified" size={28} />
                <p style={{ fontWeight: 600, fontSize: "15px", color: "#16213E", marginBottom: "4px" }}>
                  {file?.name}
                </p>
                <p style={{ fontSize: "13px", color: "#8A93A6", marginBottom: "24px" }}>
                  {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ""}
                </p>

                <div className="h-1.5 w-full bg-line rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${((stage + 1) / STAGES.length) * 100}%`,
                      background: "linear-gradient(90deg, #4F46E5, #38BDF8)",
                    }}
                  />
                </div>
                <p style={{ fontFamily: "monospace", fontSize: "14px", color: "#16213E" }}>{STAGES[stage]}</p>

                {error && (
                  <div style={{ marginTop: "24px" }}>
                    <p style={{ fontSize: "14px", color: "#B54430", marginBottom: "12px" }}>{error}</p>
                    <Button variant="secondary" onClick={() => setParsing(false)}>
                      Try again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
