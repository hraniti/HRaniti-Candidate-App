"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Redundant safety net alongside the landing page's own localStorage write —
    // covers anyone who lands here directly with the query params still attached.
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const job = params.get("job");
    if (ref) {
      try {
        localStorage.setItem("hraniti_referral", JSON.stringify({ referrerSlug: ref, jobSlug: job }));
      } catch {}
    }
  }, []);

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function handleEmailSignUp() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
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

    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-display italic text-lg text-ink">HRaniti</span>
        </div>

        <div className="paper-card p-7 sm:p-9 text-center">
          <h1 className="font-display text-3xl text-ink mb-2">Sign up in seconds</h1>
          <p className="text-ink-soft text-[15px] mb-1">Get discovered by leading employers.</p>
          <p className="font-mono text-[11px] text-verified mb-7">
            ✓ Takes less than 60 seconds
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
                <label className="text-xs font-medium text-ink-soft">Full name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jamie Rao"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-soft">Email address</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-sm focus:border-ink outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
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
                Create Account
              </Button>
            </div>
          )}

          <p className="mt-7 text-xs text-ink-soft">
            Looking to hire?{" "}
            <a href="/employer/signup" className="underline underline-offset-4">
              Post jobs as an Employer here.
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
