"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";

export default function EmployerSignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength =
    password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Too short";

  const canSubmit =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 8 &&
    agreed;

  async function handleOAuth(provider: "google" | "linkedin_oidc") {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?intent=employer` },
    });
    if (error) setError(error.message);
  }

  async function handleEmailSignUp() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    // signup_intent flows into raw_user_meta_data immediately — useful if we
    // ever need Postgres-trigger-level role awareness later.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, signup_intent: "employer" } },
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setError("An account already exists. Log in instead.");
      } else {
        setError(error.message);
      }
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account already exists. Log in instead.");
      return;
    }

    router.push(
      `/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(
        "/employer/onboarding/company"
      )}`
    );
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-display italic text-lg text-ink">HRaniti</span>
        </div>

        <div className="paper-card p-7 sm:p-9 text-center">
          <p className="font-mono text-[11px] tracking-widest text-verified uppercase mb-3">
            For Employers
          </p>
          <h1 className="font-display text-3xl text-ink mb-2">Find your next hire</h1>
          <p className="text-ink-soft text-[15px] mb-1">
            Get matched with verified, pre-assessed candidates in seconds.
          </p>
          <p className="font-mono text-[11px] text-verified mb-7">
            ✓ Post your first job free
          </p>

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => handleOAuth("google")}
            >
              Continue with Google
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => handleOAuth("linkedin_oidc")}
            >
              Continue with LinkedIn
            </Button>
          </div>

          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              className="mt-5 text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Or sign up with email
            </button>
          ) : (
            <div className="mt-6 space-y-3 text-left">
              <div className="dashed-divider pt-6" />
              <div>
                <label className="text-xs font-medium text-ink-soft">Your full name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jamie Rao"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-soft">Business email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-soft">Password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                {password.length > 0 && (
                  <p
                    className={`mt-1 text-xs font-mono ${
                      strength === "Strong"
                        ? "text-verified"
                        : strength === "Good"
                        ? "text-gold"
                        : "text-alert"
                    }`}
                  >
                    {strength}
                  </p>
                )}
              </div>
              <label className="flex items-start gap-2 text-xs text-ink-soft pt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                I agree to the Terms &amp; Conditions and Privacy Policy
              </label>

              {error && <p className="text-sm text-alert">{error}</p>}

              <Button
                className="w-full justify-center mt-2"
                disabled={!canSubmit}
                loading={loading}
                onClick={handleEmailSignUp}
              >
                Create Employer Account
              </Button>
            </div>
          )}

          <p className="mt-7 text-xs text-ink-soft">
            Looking for a job, not to hire?{" "}
            <a href="/signup" className="underline underline-offset-4">
              Sign up as a candidate here.
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
