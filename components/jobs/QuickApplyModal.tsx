"use client";

import { useState } from "react";
import { Job, Profile } from "@/lib/types";
import { calcApplicationReadiness } from "@/lib/jobMatching";
import Button from "@/components/Button";
import { X, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function QuickApplyModal({
  job,
  profile,
  onClose,
  onSubmitted,
}: {
  job: Job;
  profile: Profile;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState<"preview" | "confirm" | "submitting" | "error">("preview");
  const [error, setError] = useState<string | null>(null);
  const readiness = calcApplicationReadiness(profile);

  async function submit() {
    setStep("submitting");
    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't submit your application.");
      onSubmitted();
    } catch (e: any) {
      setError(e.message);
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-ink-soft hover:text-ink">
          <X size={18} />
        </button>

        {(step === "preview" || step === "confirm") && (
          <>
            <h3 className="font-display text-xl text-ink mb-1">
              {step === "preview" ? "Application preview" : "Review & submit"}
            </h3>
            <p className="text-sm text-ink-soft mb-4">
              {job.title} at {job.company}
            </p>

            <div className="paper-card p-4 mb-4 space-y-2">
              {readiness.items.map((i) => (
                <div key={i.key} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{i.label}</span>
                  {i.ok ? (
                    <CheckCircle2 size={15} className="text-verified" />
                  ) : (
                    <span className="inline-flex items-center gap-1 text-alert text-xs">
                      <XCircle size={13} /> Missing
                    </span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-ink-soft flex items-center gap-1.5 mb-5">
              <Clock size={12} /> Estimated application time: {readiness.estimatedSeconds} seconds
            </p>

            <Button
              className="w-full justify-center"
              onClick={() => (step === "preview" ? setStep("confirm") : submit())}
            >
              {step === "preview" ? "Review Application" : "Submit Application"}
            </Button>
          </>
        )}

        {step === "submitting" && (
          <p className="text-sm text-ink-soft font-mono text-center py-8">Submitting…</p>
        )}

        {step === "error" && (
          <div className="text-center py-4">
            <p className="text-sm text-alert mb-4">{error}</p>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}
