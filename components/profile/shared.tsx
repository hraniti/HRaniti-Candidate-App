"use client";

import { Star, RotateCcw, Check, Loader2 } from "lucide-react";
import { SaveStatus } from "@/lib/useDebouncedSave";

// Light-grey micro-label showing where a pre-filled value came from.
// Per spec: candidates should never wonder "did I type this or did the app."
export function DataOrigin({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-ink-soft/70 italic">{children}</span>;
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-soft transition-opacity">
      {status === "pending" && <span className="text-ink-soft">Editing…</span>}
      {status === "saving" && (
        <>
          <Loader2 size={12} className="animate-spin" /> Saving…
        </>
      )}
      {status === "saved" && (
        <>
          <Check size={12} className="text-verified" /> Saved
        </>
      )}
      {status === "error" && <span className="text-alert">Couldn't save — retrying</span>}
    </span>
  );
}

export function RestoreAIButton({ onRestore }: { onRestore: () => void }) {
  return (
    <button
      onClick={onRestore}
      className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink underline underline-offset-4"
    >
      <RotateCcw size={11} /> Restore AI version
    </button>
  );
}

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <Star
            size={14}
            className={n <= value ? "fill-gold text-gold" : "text-line"}
          />
        </button>
      ))}
    </div>
  );
}

export function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="paper-card p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-ink">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  origin,
  children,
}: {
  label: string;
  origin?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-medium text-ink-soft">{label}</label>
        {origin && <DataOrigin>{origin}</DataOrigin>}
      </div>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none bg-white";
