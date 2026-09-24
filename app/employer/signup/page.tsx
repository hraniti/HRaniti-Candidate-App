"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  const strength = password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Too short";
  const canSubmit = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && password.length >= 8 && agreed;

  async function handleOAuth(provider: "google" | "linkedin_oidc") {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?intent=employer` } });
    if (error) setError(error.message);
  }

  async function handleEmailSignUp() {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, signup_intent: "employer" } } });
    setLoading(false);
    if (error) { setError(error.message); return; }
    if (data.user?.identities?.length === 0) { setError("An account already exists. Log in instead."); return; }
    router.push(`/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/employer/onboarding/company")}`);
  }

  const btnStyle: React.CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", gap: 12,
    background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(220,220,220,0.8)", borderRadius: 9,
    padding: "14px 20px", fontSize: 14, fontWeight: 500, color: "#111827",
    cursor: "pointer", fontFamily: "inherit", marginBottom: 12,
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", fontFamily: "Inter,-apple-system,sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <img src="/employer-hero.jpg" alt="" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, background: "rgba(244,243,239,0.80)", zIndex: 1 }} />
      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 56 }}>
            <img src="/brand/logo-icon.png" alt="HRaniti" style={{ height: 30, width: "auto" }} />
            <span style={{ fontSize: 17, fontWeight: 600, color: "#111827", letterSpacing: "-0.02em" }}>HRaniti</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "#9ca3af", textTransform: "uppercase", marginBottom: 14 }}>For Employers</p>
          <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(40px,5vw,56px)", fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.025em", color: "#111827", marginBottom: 16 }}>
            Find the right<br /><span style={{ color: "#5b50e8" }}>talent.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.65, marginBottom: 44, maxWidth: 360 }}>
            Access pre-vetted enterprise talent and specialized experts ready for your next project.
          </p>
          <button style={btnStyle} onClick={() => handleOAuth("google")}>
            <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
            <span style={{ marginLeft: "auto", color: "#d1d5db" }}>→</span>
          </button>
          <button style={btnStyle} onClick={() => handleOAuth("linkedin_oidc")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="#0A66C2" style={{ flexShrink: 0 }}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            Continue with LinkedIn
            <span style={{ marginLeft: "auto", color: "#d1d5db" }}>→</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0 20px" }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 12, color: "#c4c4cc", whiteSpace: "nowrap" }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>
          {!showEmailForm ? (
            <button onClick={() => setShowEmailForm(true)} style={{ fontSize: 13, fontWeight: 500, color: "#5b50e8", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              Sign up with email →
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {([{ label: "Full Name", type: "text", value: name, onChange: setName, ph: "Jamie Rao" }, { label: "Business Email", type: "email", value: email, onChange: setEmail, ph: "you@company.com" }, { label: "Password", type: "password", value: password, onChange: setPassword, ph: "At least 8 characters" }] as const).map(({ label, type, value, onChange, ph }) => (
                <div key={label}>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#9ca3af", display: "block", marginBottom: 5, textTransform: "uppercase" }}>{label}</label>
                  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={ph} style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 7, padding: "11px 13px", fontSize: 14, color: "#111827", outline: "none", background: "rgba(255,255,255,0.9)", fontFamily: "inherit" }} />
                  {type === "password" && value.length > 0 && <p style={{ fontSize: 11, marginTop: 4, color: strength === "Strong" ? "#10b981" : strength === "Good" ? "#f59e0b" : "#ef4444" }}>{strength}</p>}
                </div>
              ))}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#9ca3af", cursor: "pointer" }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
                I agree to the Terms &amp; Conditions and Privacy Policy
              </label>
              {error && <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>}
              <button onClick={handleEmailSignUp} disabled={!canSubmit || loading} style={{ width: "100%", background: canSubmit ? "#5b50e8" : "#e5e7eb", color: canSubmit ? "#fff" : "#b0b0b8", border: "none", borderRadius: 8, padding: "13px 20px", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {loading ? "Creating account…" : "Create Employer Account →"}
              </button>
            </div>
          )}
          {error && !showEmailForm && <p style={{ fontSize: 13, color: "#ef4444", marginTop: 12 }}>{error}</p>}
          <p style={{ marginTop: 48, fontSize: 13, color: "#9ca3af" }}>
            Looking for opportunities instead?{" "}
            <a href="/signup" style={{ color: "#5b50e8", fontWeight: 600, textDecoration: "none" }}>Join as Talent. →</a>
          </p>
        </div>
      </div>
    </div>
  );
}