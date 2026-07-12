"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, ReferralPaymentMethod, ReferralPayment, ReferralKYC, Referral } from "@/lib/types";
import { formatINR, KYC_THRESHOLD_INR, expectedPaymentDate } from "@/lib/referralRewards";
import Button from "@/components/Button";
import { Upload, CreditCard, ShieldCheck, Clock, Download } from "lucide-react";

export default function PaymentCentrePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [methods, setMethods] = useState<ReferralPaymentMethod[]>([]);
  const [payments, setPayments] = useState<ReferralPayment[]>([]);
  const [kyc, setKyc] = useState<ReferralKYC | null>(null);
  const [referralsWithJoinDate, setReferralsWithJoinDate] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const [methodType, setMethodType] = useState<"upi" | "bank">("upi");
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [savingMethod, setSavingMethod] = useState(false);
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, methodsRes, kycRes, { data: refs }, { data: pays }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetch("/api/referrals/payment-methods").then((r) => r.json()),
        fetch("/api/referrals/kyc").then((r) => r.json()),
        supabase.from("referrals").select("*, job:jobs(*)").eq("referrer_id", user.id).not("joined_date", "is", null),
        supabase.from("referral_payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      setProfile(p as Profile);
      setMethods(methodsRes.methods ?? []);
      setKyc(kycRes.kyc);
      setReferralsWithJoinDate((refs as Referral[]) ?? []);
      setPayments((pays as ReferralPayment[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function saveMethod() {
    setSavingMethod(true);
    setError(null);
    try {
      const res = await fetch("/api/referrals/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methodType,
          upiId,
          bankAccountNumber,
          bankIfsc,
          bankAccountHolderName: bankHolderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMethods((prev) => [data.method, ...prev]);
      setUpiId(""); setBankAccountNumber(""); setBankIfsc(""); setBankHolderName("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingMethod(false);
    }
  }

  async function uploadKycDoc(file: File) {
    setUploadingKyc(true);
    setError(null);
    const form = new FormData();
    form.append("document", file);
    try {
      const res = await fetch("/api/referrals/kyc", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKyc(data.kyc);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingKyc(false);
    }
  }

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  const kycRequired = profile.lifetime_referral_earnings >= KYC_THRESHOLD_INR;

  return (
    <div>
      {error && <p className="text-sm text-alert mb-4">{error}</p>}

      {/* Payment methods */}
      <section className="paper-card p-6 mb-6">
        <h2 className="inline-flex items-center gap-1.5 font-medium text-ink mb-4">
          <CreditCard size={15} /> Payout Method
        </h2>
        {methods.length > 0 && (
          <div className="mb-4 space-y-2">
            {methods.map((m) => (
              <div key={m.id} className="text-sm text-ink bg-paper rounded-lg px-3 py-2">
                {m.method_type === "upi" ? `UPI: ${m.upi_id}` : `Bank: ${m.bank_account_holder_name} — ****${m.bank_account_number?.slice(-4)}`}
                {m.is_default && <span className="text-verified text-xs ml-2">Default</span>}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setMethodType("upi")} className={`text-sm px-3 py-1.5 rounded-full border ${methodType === "upi" ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line"}`}>UPI</button>
          <button onClick={() => setMethodType("bank")} className={`text-sm px-3 py-1.5 rounded-full border ${methodType === "bank" ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line"}`}>Bank Transfer</button>
        </div>
        {methodType === "upi" ? (
          <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm mb-3" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input value={bankHolderName} onChange={(e) => setBankHolderName(e.target.value)} placeholder="Account holder name" className="rounded-lg border border-line px-3 py-2.5 text-sm sm:col-span-2" />
            <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Account number" className="rounded-lg border border-line px-3 py-2.5 text-sm" />
            <input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} placeholder="IFSC code" className="rounded-lg border border-line px-3 py-2.5 text-sm" />
          </div>
        )}
        <Button loading={savingMethod} onClick={saveMethod}>Save Payout Method</Button>
      </section>

      {/* KYC */}
      <section className="paper-card p-6 mb-6">
        <h2 className="inline-flex items-center gap-1.5 font-medium text-ink mb-2">
          <ShieldCheck size={15} /> KYC Verification
        </h2>
        <p className="text-xs text-ink-soft mb-4">
          Required once your earnings cross {formatINR(KYC_THRESHOLD_INR)}. Your current lifetime earnings:{" "}
          {formatINR(profile.lifetime_referral_earnings)}.
        </p>
        {!kycRequired && !kyc && <p className="text-sm text-ink-soft italic">Not required yet.</p>}
        {(kycRequired || kyc) && (
          <div>
            {kyc?.status === "verified" && <p className="text-sm text-verified">✓ Verified</p>}
            {kyc?.status === "pending" && <p className="text-sm text-gold">⏳ Submitted — pending review</p>}
            {kyc?.status === "rejected" && <p className="text-sm text-alert">Rejected — {kyc.admin_notes ?? "please resubmit"}</p>}
            {(!kyc || kyc.status === "rejected") && (
              <label className="inline-flex items-center gap-1.5 text-sm text-ink cursor-pointer mt-2">
                <Upload size={14} /> {uploadingKyc ? "Uploading…" : "Upload Government ID"}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadKycDoc(e.target.files[0])} />
              </label>
            )}
          </div>
        )}
      </section>

      {/* Payment timeline for joined referrals */}
      {referralsWithJoinDate.length > 0 && (
        <section className="paper-card p-6 mb-6">
          <h2 className="inline-flex items-center gap-1.5 font-medium text-ink mb-3">
            <Clock size={15} /> Payment Timeline
          </h2>
          <div className="space-y-3">
            {referralsWithJoinDate.map((r) => {
              const joined = new Date(r.joined_date!);
              const payDate = expectedPaymentDate(joined);
              return (
                <div key={r.id} className="text-sm">
                  <p className="text-ink">{r.candidate_name || r.candidate_email} — {r.job?.title}</p>
                  <p className="text-xs text-ink-soft">
                    Joined {joined.toLocaleDateString()} → Payment Batch {payDate.toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Payment history */}
      <section className="paper-card p-6 mb-6">
        <h2 className="font-medium text-ink mb-3">Payment History</h2>
        {payments.length === 0 && <p className="text-sm text-ink-soft italic">No payments yet.</p>}
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm border-b border-line last:border-0 py-2">
              <div>
                <p className="text-ink">{p.created_at && new Date(p.created_at).toLocaleDateString()}</p>
                <p className="text-xs text-ink-soft">{p.method_type} · {p.transaction_id ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-ink">{formatINR(p.amount_inr)}</p>
                <p className="text-xs text-ink-soft">{p.status}</p>
              </div>
              {p.receipt_url && (
                <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-ink-soft hover:text-ink">
                  <Download size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="paper-card p-6 bg-paper">
        <p className="text-xs text-ink-soft">
          <strong>How payouts work:</strong> submit your payout details above → weekly payout batch every Friday →
          HRaniti reviews and approves → funds are transferred. Automated transfer via Razorpay Payouts isn't
          connected yet — until then, payouts are processed and marked here manually once sent.
        </p>
      </section>
    </div>
  );
}
