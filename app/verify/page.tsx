"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const supabase = createClient();

  const [digits, setDigits] = useState(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verifyCode(code: string) {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    setLoading(false);

    if (error) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 3) {
        setLocked(true);
        setError("Too many failed attempts. Use a different email.");
      } else {
        setError("That code didn't match. Try again.");
      }
      setDigits(Array(6).fill(""));
      inputsRef.current[0]?.focus();
      return;
    }

    router.push("/onboarding/resume");
  }

  function handleChange(i: number, val: string) {
    if (locked) return;
    const v = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);

    if (v && i < 5) inputsRef.current[i + 1]?.focus();

    if (next.every((d) => d !== "") && next.join("").length === 6) {
      verifyCode(next.join(""));
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  }

  async function resend() {
    setCooldown(30);
    await supabase.auth.resend({ type: "signup", email });
  }

  return (
    <StepShell title="Verify your email" subtitle={`We've sent a 6-digit code to ${email || "your email"}`}>
      <div className="flex gap-2 justify-center mb-5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            value={d}
            disabled={locked || loading}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono rounded-lg border border-line focus:border-ink outline-none py-3"
          />
        ))}
      </div>

      {error && <p className="text-sm text-alert text-center mb-4">{error}</p>}

      <div className="flex items-center justify-between text-sm">
        <button
          onClick={resend}
          disabled={cooldown > 0 || locked}
          className="text-ink-soft underline underline-offset-4 disabled:opacity-40 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <a href="/signup" className="text-ink-soft underline underline-offset-4">
          Use a different email
        </a>
      </div>

      {locked && (
        <Button className="w-full justify-center mt-6" onClick={() => router.push("/signup")}>
          Back to sign up
        </Button>
      )}
    </StepShell>
  );
}
