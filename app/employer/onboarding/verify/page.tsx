"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import Seal from "@/components/Seal";
import { ShieldCheck } from "lucide-react";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

function extractDomain(url: string) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export default function VerifyStep() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [hqLocation, setHqLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [domainVerified, setDomainVerified] = useState(false);
  const [manualRequested, setManualRequested] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const companyId = await getOrCreateCompanyId(supabase, user);
      const { data } = await supabase.from("companies").select("*").eq("id", companyId).single();
      if (data) {
        setCompanyName(data.name ?? "");
        setHqLocation(data.hq_location ?? "");
        setWebsite(data.website ?? "");
        setEmail(data.business_email ?? "");
        setDomainVerified(data.domain_verified ?? false);
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const websiteDomain = extractDomain(website);
  const emailDomain = email.includes("@") ? email.split("@")[1].toLowerCase() : null;
  // Tier 1: automatic — business email domain matches the company website domain.
  const autoMatch = !!websiteDomain && !!emailDomain && websiteDomain === emailDomain;

  async function finishOnboarding(tier: "auto" | "manual" | "none", verified: boolean) {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const companyId = await getOrCreateCompanyId(supabase, user);
      await supabase
        .from("companies")
        .update({
          domain_verified: verified,
          verification_tier: tier,
          onboarding_step: "done",
          onboarding_completed: true,
        })
        .eq("id", companyId);
    }
    setSaving(false);
    router.push("/employer/dashboard");
  }

  if (loading) return null;

  return (
    <StepShell
      step={6}
      total={6}
      eyebrow="Employer Onboarding"
      title="Verify your company"
      subtitle="Verified employers get a badge shown on every job post and shortlist."
    >
      <div className="text-center py-4">
        {domainVerified ? (
          <VerifiedResult onFinish={() => finishOnboarding("auto", true)} saving={saving} />
        ) : autoMatch ? (
          <div className="space-y-4">
            <ShieldCheck size={36} className="text-verified mx-auto" />
            <p className="text-sm text-ink-soft">
              Your business email domain (<span className="font-mono">{emailDomain}</span>) matches
              your company website — you're eligible for instant verification.
            </p>
            <Button className="w-full justify-center" loading={saving} onClick={() => finishOnboarding("auto", true)}>
              Verify instantly
            </Button>
          </div>
        ) : manualRequested ? (
          <div className="space-y-3">
            <Seal label="Manual review requested" confidence={100} stamp />
            <p className="text-sm text-ink-soft">
              Our team will review your Business Registration Number, GST/VAT, or LinkedIn Company
              Page within 24–48 hours. You can start posting jobs in the meantime — the badge appears
              automatically once approved.
            </p>
            <Button className="w-full justify-center" loading={saving} onClick={() => finishOnboarding("manual", false)}>
              Continue to dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <p className="text-sm text-ink-soft text-center">
              Your email (<span className="font-mono">{emailDomain ?? "—"}</span>) doesn't match your
              website domain, so instant verification isn't available. Two other options:
            </p>
            <div className="paper-card p-4">
              <p className="text-sm font-medium text-ink mb-1">Add a DNS record or meta tag</p>
              <p className="text-xs text-ink-soft">
                If you manage {companyName || "your company"}'s website, add a verification record we
                generate — checked automatically. (Coming shortly after launch.)
              </p>
            </div>
            <div className="paper-card p-4">
              <p className="text-sm font-medium text-ink mb-1">Manual review</p>
              <p className="text-xs text-ink-soft mb-3">
                Upload a Business Registration Number, GST/VAT document, or LinkedIn Company Page —
                reviewed by our team within 24–48 hours.
              </p>
              <Button variant="secondary" className="w-full justify-center" onClick={() => setManualRequested(true)}>
                Request manual verification
              </Button>
            </div>
            <Button variant="ghost" className="w-full justify-center" loading={saving} onClick={() => finishOnboarding("none", false)}>
              Skip for now — continue to dashboard
            </Button>
          </div>
        )}
      </div>
    </StepShell>
  );
}

function VerifiedResult({ onFinish, saving }: { onFinish: () => void; saving: boolean }) {
  return (
    <div className="space-y-4">
      <ShieldCheck size={40} className="text-verified mx-auto" />
      <Seal label="Verified Employer" confidence={100} stamp />
      <Button className="w-full justify-center" loading={saving} onClick={onFinish}>
        Continue to dashboard
      </Button>
    </div>
  );
}
