"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PendingContent() {
  const params = useSearchParams();
  const email = params.get("email");
  return <main className="flex min-h-screen items-center justify-center bg-[#FCFCFA] px-5 py-10 text-[#173454]"><section className="w-full max-w-lg rounded-3xl border border-[#DDE5EA] bg-white p-8 text-center shadow-sm sm:p-10"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F4F1] text-2xl text-[#167D73]" aria-hidden="true">✓</div><p className="mt-6 text-[10px] font-semibold tracking-[.18em] text-[#167D73]">APPLICATION RECEIVED</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Thank you for applying.</h1><p className="mt-4 text-sm leading-6 text-[#71859A]">Your freelancer account request has been submitted. HRANITI must review and activate your recruiter access before you can use the freelancer workspace.</p>{email && <p className="mt-4 break-words rounded-xl bg-[#F5F8F8] p-3 text-sm">Application email: <strong>{email}</strong></p>}<p className="mt-4 text-sm leading-6 text-[#71859A]">If email verification is enabled, please complete it using the message sent to your inbox. If you don't receive it, check your spam folder.</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/login" className="rounded-xl bg-[#167D73] px-5 py-3 text-sm font-semibold text-white">Go to sign in</Link><Link href="/signup" className="rounded-xl border border-[#DDE5EA] px-5 py-3 text-sm font-semibold">Back to HRANITI</Link></div></section></main>;
}
export default function FreelancerPendingPage() { return <Suspense fallback={<main className="min-h-screen bg-[#FCFCFA]" />}><PendingContent /></Suspense>; }
