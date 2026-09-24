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
    if (error) { setError(error.message.toLowerCase().includes("already registered") ? "An account already exists. Log in instead." : error.message); return; }
    if (data.user && data.user.identities && data.user.identities.length === 0) { setError("An account already exists. Log in instead."); return; }
    router.push(`/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/employer/onboarding/company")}`);
  }

  const inp: React.CSSProperties = { width: "100%", border: "1px solid #dddde0", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#1a1a2e", outline: "none", background: "#fff", boxSizing: "border-box" };

  return (
    <main style={{ minHeight: "100vh", display: "flex", fontFamily: "'Inter', system-ui, sans-serif", background: "#f7f6f2" }}>
      <div style={{ width: "55%", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "44px 64px", background: "#f7f6f2", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/brand/logo-icon.png" alt="HRaniti" style={{ height: 34, width: "auto" }} />
          <span style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e", letterSpacing: "-0.02em" }}>HRaniti</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 420, paddingTop: 48, paddingBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: "#9898a8", marginBottom: 20, textTransform: "uppercase" as const }}>For Employers</p>
          <h1 style={{ fontFamily: "'Georgia', serif", fontSize: 52, fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#1a1a2e", marginBottom: 18 }}>
            Find the right<br /><span style={{ color: "#6c5ce7" }}>talent.</span>
          </h1>
          <p style={{ fontSize: 15, color: "#9898a8", lineHeight: 1.7, marginBottom: 40 }}>Access pre-vetted enterprise talent and specialized experts ready for your next project.</p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, marginBottom: 28 }}>
            {([{ p: "google" as const, label: "Continue with Google", icon: <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> }, { p: "linkedin_oidc" as const, label: "Continue with LinkedIn", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> }]).map(({ p, label, icon }) => (
              <button key={p} onClick={() => handleOAuth(p)} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid #dddde0", borderRadius: 10, padding: "13px 20px", fontSize: 14, fontWeight: 500, color: "#1a1a2e", cursor: "pointer" }}>
                {icon}{label}<span style={{ marginLeft: "auto", color: "#c8c8d4" }}>→</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: "#dddde0" }} />
            <span style={{ fontSize: 12, color: "#b8b8c4" }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "#dddde0" }} />
          </div>
          {!showEmailForm ? (
            <button onClick={() => setShowEmailForm(true)} style={{ fontSize: 13, color: "#6c5ce7", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textAlign: "left" as const, padding: 0 }}>Sign up with email →</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
              {([{ label: "FULL NAME", type: "text", value: name, onChange: setName, ph: "Jamie Rao" }, { label: "BUSINESS EMAIL", type: "email", value: email, onChange: setEmail, ph: "you@company.com" }, { label: "PASSWORD", type: "password", value: password, onChange: setPassword, ph: "At least 8 characters" }] as const).map(({ label, type, value, onChange, ph }) => (
                <div key={label}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#9898a8", letterSpacing: "0.12em", display: "block", marginBottom: 6 }}>{label}</label>
                  <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={ph} style={inp} />
                  {type === "password" && value.length > 0 && <p style={{ fontSize: 11, marginTop: 4, color: strength === "Strong" ? "#00b894" : strength === "Good" ? "#f0a040" : "#e84040" }}>{strength}</p>}
                </div>
              ))}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#9898a8", cursor: "pointer" }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />I agree to the Terms &amp; Conditions and Privacy Policy
              </label>
              {error && <p style={{ fontSize: 13, color: "#e84040" }}>{error}</p>}
              <button onClick={handleEmailSignUp} disabled={!canSubmit || loading} style={{ background: canSubmit ? "#6c5ce7" : "#e0e0e6", color: canSubmit ? "#fff" : "#aaa", border: "none", borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed", marginTop: 4 }}>
                {loading ? "Creating account…" : "Create Employer Account →"}
              </button>
            </div>
          )}
          {error && !showEmailForm && <p style={{ fontSize: 13, color: "#e84040", marginTop: 12 }}>{error}</p>}
        </div>
        <p style={{ fontSize: 13, color: "#b8b8c4" }}>Looking for opportunities instead?{" "}<a href="/signup" style={{ color: "#6c5ce7", fontWeight: 600, textDecoration: "none" }}>Join as Talent. →</a></p>
      </div>
      <div style={{ width: "45%", minHeight: "100vh", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <img
          src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=90&auto=format&fit=crop&crop=center"
          alt="Minimal Scandinavian workspace"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(247,246,242,0.3) 0%, transparent 25%)" }} />
      </div>
    </main>
  );
}
