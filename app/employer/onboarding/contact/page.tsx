"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StepShell from "@/components/StepShell";
import Button from "@/components/Button";
import Field from "@/components/employer/Field";
import EmployerInputStyles from "@/components/employer/EmployerInputStyles";

export default function ContactStep() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hrContact, setHrContact] = useState("");
  const [recruiter, setRecruiter] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("employers").select("*").eq("id", user.id).single();
      if (data) {
        setHrContact(data.hr_contact_name ?? "");
        setRecruiter(data.recruiter_name ?? "");
        setEmail(data.business_email ?? user.email ?? "");
        setPhone(data.phone ?? "");
      } else {
        setEmail(user.email ?? "");
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canContinue = hrContact.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && phone.trim().length > 4;

  async function handleContinue() {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("employers")
      .update({
        hr_contact_name: hrContact,
        recruiter_name: recruiter || hrContact,
        business_email: email,
        phone,
        onboarding_step: "branding",
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/employer/onboarding/branding");
  }

  if (loading) return null;

  return (
    <StepShell
      step={2}
      total={6}
      eyebrow="Employer Onboarding"
      title="Who should we reach for hiring updates?"
      subtitle="Shortlist alerts and candidate responses land here."
    >
      <div className="space-y-4 text-left">
        <Field label="Primary HR Contact" required>
          <input className="input" value={hrContact} onChange={(e) => setHrContact(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Recruiter Name" hint="Can be same as above">
          <input className="input" value={recruiter} onChange={(e) => setRecruiter(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Business Email" required>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </Field>
        <Field label="Phone Number" required>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." />
        </Field>

        {error && <p className="text-sm text-alert">{error}</p>}

        <div className="flex gap-2 mt-2">
          <Button variant="secondary" onClick={() => router.push("/employer/onboarding/company")}>
            Back
          </Button>
          <Button className="flex-1 justify-center" disabled={!canContinue} loading={saving} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </div>
      <EmployerInputStyles />
    </StepShell>
  );
}
