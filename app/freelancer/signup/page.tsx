"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FreelancerSignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Please enter your full name.");
    if (password.length < 8) return setError("Use a password with at least 8 characters.");
    if (!agreed) return setError("Please agree to the privacy notice to continue.");
    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          phone: phone.trim(),
          recruitment_experience: experience,
          signup_intent: "freelancer",
          freelancer_application_status: "pending",
        },
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message.toLowerCase().includes("already registered")
        ? "An account already exists for this email. Please sign in instead."
        : signUpError.message);
      return;
    }
    if (data.user?.identities?.length === 0) {
      setError("An account may already exist for this email. Please sign in instead.");
      return;
    }
    router.push("/freelancer/pending?email=" + encodeURIComponent(email.trim().toLowerCase()));
  }

  return (
    <main className="min-h-screen bg-[#FCFCFA] px-5 py-10 text-[#173454]">
      <div className="mx-auto max-w-xl">
        <Link href="/signup" className="text-sm font-semibold text-[#167D73]">HRANITI</Link>
        <div className="mt-7 rounded-3xl border border-[#DDE5EA] bg-white p-6 shadow-sm sm:p-9">
          <p className="text-[10px] font-semibold tracking-[.18em] text-[#167D73]">FREELANCER NETWORK</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Join as a freelance recruiter</h1>
          <p className="mt-3 text-sm leading-6 text-[#71859A]">Tell us a little about yourself. HRANITI will review your application before recruitment workspace access is enabled.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-medium">Full name <span className="text-red-600">*</span>
              <input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] px-3.5 py-3 outline-none focus:border-[#167D73]" />
            </label>
            <label className="block text-sm font-medium">Email address <span className="text-red-600">*</span>
              <input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] px-3.5 py-3 outline-none focus:border-[#167D73]" />
            </label>
            <label className="block text-sm font-medium">Phone number <span className="text-[#71859A]">(optional)</span>
              <input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] px-3.5 py-3 outline-none focus:border-[#167D73]" />
            </label>
            <label className="block text-sm font-medium">Recruitment experience
              <select value={experience} onChange={e=>setExperience(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] bg-white px-3.5 py-3 outline-none focus:border-[#167D73]">
                <option value="">Select experience (optional)</option>
                <option value="Less than 1 year">Less than 1 year</option>
                <option value="1–3 years">1–3 years</option>
                <option value="4–7 years">4–7 years</option>
                <option value="8+ years">8+ years</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Create password <span className="text-red-600">*</span>
              <input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] px-3.5 py-3 outline-none focus:border-[#167D73]" />
              <span className="mt-1 block text-xs text-[#71859A]">At least 8 characters.</span>
            </label>
            <label className="flex items-start gap-2 text-sm leading-5 text-[#71859A]">
              <input required type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} className="mt-1 accent-[#167D73]" />
              <span>I agree that HRANITI may use these details to review my freelancer application and contact me about it.</span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-[#167D73] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Submitting application…" : "Create account & apply"}</button>
          </form>
          <p className="mt-5 text-center text-sm text-[#71859A]">Already registered? <Link href="/login" className="font-semibold text-[#167D73] hover:underline">Sign in</Link></p>
          <p className="mt-5 border-t border-[#EEF2F4] pt-4 text-xs leading-5 text-[#71859A]">Creating an account does not grant immediate access. Your application must be reviewed and your HRANITI recruiter workspace activated.</p>
        </div>
      </div>
    </main>
  );
}
