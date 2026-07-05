"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Generic 2-second debounced auto-save hook.
 * Call `queueSave(patch)` on every field change; the hook merges patches and
 * fires the actual save 2 seconds after the last call, never on every keystroke.
 */
export function useDebouncedSave<T extends Record<string, any>>(
  save: (patch: Partial<T>) => Promise<void>,
  delayMs = 2000
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const pending = useRef<Partial<T>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (Object.keys(pending.current).length === 0) return;
    const patch = pending.current;
    pending.current = {};
    setStatus("saving");
    try {
      await save(patch);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setStatus("error");
    }
  }, [save]);

  const queueSave = useCallback(
    (patch: Partial<T>) => {
      pending.current = { ...pending.current, ...patch };
      setStatus("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [flush, delayMs]
  );

  const saveNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    flush();
  }, [flush]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { status, queueSave, saveNow };
}
