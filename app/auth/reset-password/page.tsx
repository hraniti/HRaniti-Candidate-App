"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const supabase = createClient();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function prepare() {
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && mounted) setError("This password reset link is invalid or has expired. Request a new one.");
      }
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        const hash = typeof window !== "undefined" ? window.location.hash : "";
        const hasRecoveryTokens = hash.includes("access_token=") && (hash.includes("type=recovery") || hash.includes("refresh_token="));
        setReady(Boolean(data.session) || hasRecoveryTokens);
        if (!data.session && !hasRecoveryTokens && !code) setError("Open the password reset link from your email, or request a new one.");
      }
    }
    prepare();
    return () => { mounted = false; };
  }, [params, supabase]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); return; }
    if (password !== confirm) { setError("The passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#FCFCFA] px-5 py-12 text-[#173454]"><section className="w-full max-w-md rounded-3xl border border-[#DDE5EA] bg-white p-7 shadow-sm sm:p-9"><Link href="/signup" className="text-sm font-semibold text-[#167D73]">HRANITI</Link><p className="mt-7 text-[10px] font-semibold tracking-[.18em] text-[#167D73]">ACCOUNT SECURITY</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Reset your password</h1><p className="mt-3 text-sm leading-6 text-[#71859A]">Choose a new password for your HRANITI account.</p>{success ? <div className="mt-6"><p role="status" className="rounded-xl bg-[#F0F8F5] p-4 text-sm text-[#167D73]">Your password has been updated successfully.</p><Link href="/login" className="mt-5 inline-flex w-full justify-center rounded-xl bg-[#167D73] px-4 py-3 text-sm font-semibold text-white">Return to sign in</Link></div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm font-medium">New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] px-3.5 py-3 outline-none focus:border-[#167D73]" /></label><label className="block text-sm font-medium">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDE5EA] px-3.5 py-3 outline-none focus:border-[#167D73]" /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{ready && <button disabled={busy} className="w-full rounded-xl bg-[#167D73] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Updating password…" : "Update password"}</button>}{!ready && <Link href="/login" className="inline-flex text-sm font-semibold text-[#167D73] hover:underline">Return to sign in to request a new link</Link>}</form>}</section></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#FCFCFA]" />}><ResetPasswordForm /></Suspense>;
}
