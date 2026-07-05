"use client";

import { useState } from "react";
import { X, Sparkles, FileText, Target } from "lucide-react";
import Button from "@/components/Button";

type Mode = "professional" | "ats" | "custom";

export default function RegenerateModal({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated: (text: string) => void;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(selected: Mode) {
    setMode(selected);
    if (selected === "custom" && !customPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/regenerate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selected, customPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't generate a summary.");
      onGenerated(data.summary);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-card max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-ink-soft hover:text-ink">
          <X size={18} />
        </button>
        <h3 className="font-display text-xl text-ink mb-1">Regenerate summary</h3>
        <p className="text-sm text-ink-soft mb-5">Choose how you'd like your summary rewritten.</p>

        <div className="space-y-2">
          <OptionRow
            icon={<Sparkles size={16} />}
            label="Professional Version"
            detail="Polished, career-focused summary for human recruiters."
            loading={loading && mode === "professional"}
            onClick={() => generate("professional")}
          />
          <OptionRow
            icon={<FileText size={16} />}
            label="ATS Optimized Version"
            detail="Keyword-dense summary optimized for applicant tracking systems."
            loading={loading && mode === "ats"}
            onClick={() => generate("ats")}
          />
          <div className="rounded-lg border border-line p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-ink" />
              <span className="text-sm font-medium text-ink">Custom Prompt</span>
            </div>
            <div className="flex gap-2">
              <input
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Make it suitable for SAP Project Manager roles"
                className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:border-ink outline-none"
              />
              <Button
                variant="secondary"
                disabled={!customPrompt.trim()}
                loading={loading && mode === "custom"}
                onClick={() => generate("custom")}
              >
                Go
              </Button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-alert mt-4">{error}</p>}
      </div>
    </div>
  );
}

function OptionRow({
  icon,
  label,
  detail,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full text-left rounded-lg border border-line p-3 hover:border-ink/40 transition-colors flex items-start gap-3 disabled:opacity-60"
    >
      <span className="text-ink mt-0.5">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}{loading ? " — generating…" : ""}</span>
        <span className="block text-xs text-ink-soft">{detail}</span>
      </span>
    </button>
  );
}
