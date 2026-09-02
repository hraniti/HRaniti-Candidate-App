"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Briefcase, Users, Sparkles, ShieldCheck, Lock, Zap } from "lucide-react";

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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const strength =
    password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Too short";

  const canSubmit =
    firstName.trim().length >= 1 &&
    lastName.trim().length >= 1 &&
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

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
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
    <main
      className="grid grid-cols-1 lg:grid-cols-2"
      style={{ minHeight: "100vh", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
    >
      {/* Left — brand panel, 50vw / 80px padding */}
      <div
        className="relative flex flex-col justify-between overflow-hidden text-white"
        style={{ padding: "80px" }}
      >
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
          <h1 style={{ fontWeight: 700, fontSize: "48px", lineHeight: 1.15, marginBottom: "20px" }}>
            Find your next opportunity,{" "}
            <span className="text-cyan-300" style={{ fontWeight: 700, fontSize: "48px", lineHeight: 1.15 }}>
              faster.
            </span>
          </h1>
          <p style={{ fontWeight: 400, fontSize: "18px", lineHeight: 1.6, color: "rgba(255,255,255,0.8)", marginBottom: "40px" }}>
            Connect with top employers and discover roles that match your skills and goals.
          </p>

          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Discover top opportunities</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Access thousands of verified job openings from leading companies.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Create your professional profile</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Build a profile that highlights your skills and experience.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "17px", lineHeight: 1.4 }}>Get noticed by employers</p>
                <p style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>
                  Employers search for talent like you. Let them find you.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div />
      </div>

      {/* Right — form, 50vw / 48px 72px padding */}
      <div className="relative flex flex-col bg-paper" style={{ padding: "48px 72px" }}>
        <p
          className="absolute"
          style={{ top: "32px", right: "48px", fontWeight: 400, fontSize: "14px", lineHeight: 1, color: "#3A4460" }}
        >
          Already have an account?{" "}
          <a href="/login" style={{ fontWeight: 600, fontSize: "14px", lineHeight: 1, color: "#4F46E5" }}>
            Sign in
          </a>
        </p>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full" style={{ maxWidth: "580px" }}>
            <div
              className="bg-white shadow-card"
              style={{ borderRadius: "16px", padding: "52px" }}
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="h-14 w-14 rounded-full bg-ink/5 flex items-center justify-center mb-4">
                  <img src="/brand/logo-icon.png" alt="" className="h-7 w-auto" />
                </div>
                <h2 style={{ fontWeight: 700, fontSize: "26px", lineHeight: 1.2, color: "#16213E", marginBottom: "6px" }}>
                  Create your account
                </h2>
                <p style={{ fontWeight: 400, fontSize: "16px", lineHeight: 1.5, color: "#3A4460" }}>
                  Get started in <span style={{ color: "#4F46E5" }}>less than 60 seconds</span>
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handleOAuth("google")}
                  className="w-full flex items-center justify-center gap-2 rounded border-[1.5px] border-line bg-white hover:border-ink/50 transition-all"
                  style={{ fontWeight: 600, fontSize: "15px", lineHeight: 1, padding: "14px", color: "#16213E" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9C16.64 14.2 17.64 11.9 17.64 9.2z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03z" />
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
                  </svg>
                  Continue with Google
                </button>
                <button
                  onClick={() => handleOAuth("linkedin_oidc")}
                  className="w-full flex items-center justify-center gap-2 rounded border-[1.5px] border-line bg-white hover:border-ink/50 transition-all"
                  style={{ fontWeight: 600, fontSize: "15px", lineHeight: 1, padding: "14px", color: "#16213E" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <rect width="18" height="18" rx="3" fill="#0A66C2" />
                    <path fill="#fff" d="M5.34 7.1H3V15h2.34V7.1zM4.17 6.1a1.36 1.36 0 1 0 0-2.72 1.36 1.36 0 0 0 0 2.72zM15 10.6c0-2.1-1.12-3.08-2.62-3.08-1.2 0-1.74.66-2.04 1.13V7.1H8V15h2.34v-4.4c0-.24.02-.47.09-.64.19-.47.63-.96 1.36-.96.96 0 1.34.73 1.34 1.8V15H15v-4.4z" />
                  </svg>
                  Continue with LinkedIn
                </button>
              </div>

              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-line" />
                <span style={{ fontWeight: 400, fontSize: "14px", lineHeight: 1, color: "#3A4460" }}>
                  or sign up with email
                </span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <div className="space-y-3 text-left">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="w-full rounded-lg border border-line px-3 focus:border-ink outline-none"
                    style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1, padding: "12px 14px" }}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                  <input
                    className="w-full rounded-lg border border-line px-3 focus:border-ink outline-none"
                    style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1, padding: "12px 14px" }}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <input
                  type="email"
                  className="w-full rounded-lg border border-line px-3 focus:border-ink outline-none"
                  style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1, padding: "12px 14px" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-line px-3 pr-10 focus:border-ink outline-none"
                    style={{ fontWeight: 400, fontSize: "15px", lineHeight: 1, padding: "12px 14px" }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-soft"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <p
                    className={`font-mono ${
                      strength === "Strong"
                        ? "text-verified"
                        : strength === "Good"
                        ? "text-gold"
                        : "text-alert"
                    }`}
                    style={{ fontSize: "13px" }}
                  >
                    {strength}
                  </p>
                )}

                <label
                  className="flex items-center gap-2 pt-1"
                  style={{ fontWeight: 400, fontSize: "13px", lineHeight: 1.5, color: "#3A4460" }}
                >
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span>
                    I agree to the{" "}
                    <a href="/terms" style={{ color: "#4F46E5" }} onClick={(e) => e.stopPropagation()}>
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" style={{ color: "#4F46E5" }} onClick={(e) => e.stopPropagation()}>
                      Privacy Policy
                    </a>
                  </span>
                </label>

                {error && (
                  <p style={{ fontSize: "13px", color: "#B54430" }}>{error}</p>
                )}

                <button
                  disabled={!canSubmit || loading}
                  onClick={handleEmailSignUp}
                  className="w-full rounded-lg text-white transition-all bg-gradient-to-r from-[#4F46E5] to-[#38BDF8] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ fontWeight: 600, fontSize: "15px", lineHeight: 1, padding: "14px" }}
                >
                  {loading ? "Working…" : "Create account"}
                </button>

                <p
                  className="flex items-center justify-center gap-1.5 pt-1"
                  style={{ fontWeight: 400, fontSize: "13px", lineHeight: 1.5, color: "#8A93A6" }}
                >
                  <Lock size={12} /> Your data is secure and safe with us.
                </p>
              </div>

              <p
                className="mt-6 text-center"
                style={{ fontWeight: 400, fontSize: "13px", lineHeight: 1.5, color: "#3A4460" }}
              >
                Looking to hire?{" "}
                <a href="/employer/signup" style={{ fontWeight: 600, color: "#16213E" }}>
                  Post jobs as an Employer here.
                </a>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-center gap-8" style={{ color: "#8A93A6" }}>
              <span className="flex items-center gap-1.5" style={{ fontWeight: 600, fontSize: "13px", lineHeight: 1.4 }}>
                <ShieldCheck size={14} /> Trusted by Top Employers
              </span>
              <span className="flex items-center gap-1.5" style={{ fontWeight: 600, fontSize: "13px", lineHeight: 1.4 }}>
                <Lock size={14} /> Secure &amp; Private
              </span>
              <span className="flex items-center gap-1.5" style={{ fontWeight: 600, fontSize: "13px", lineHeight: 1.4 }}>
                <Zap size={14} /> Quick &amp; Easy
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
