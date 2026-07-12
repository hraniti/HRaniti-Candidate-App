"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Job } from "@/lib/types";
import { formatINR } from "@/lib/referralRewards";
import Button from "@/components/Button";
import { Copy, Upload, Search, Linkedin, Mail, CheckCircle2 } from "lucide-react";

export default function ReferSomeonePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Agreement gate
  const [agreeKnow, setAgreeKnow] = useState(false);
  const [agreePermission, setAgreePermission] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Network import
  const [importResult, setImportResult] = useState<{ imported: number; activeMatches: number } | null>(null);
  const [importing, setImporting] = useState(false);

  // Resume upload + refer
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [candidateLinkedin, setCandidateLinkedin] = useState("");
  const [candidateRole, setCandidateRole] = useState("");
  const [matchedJobs, setMatchedJobs] = useState<Job[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [referring, setReferring] = useState<string | null>(null);
  const [referSuccess, setReferSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search existing candidate
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: j }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      ]);
      setProfile(p as Profile);
      setJobs((j as Job[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function acceptAgreement() {
    setAccepting(true);
    const res = await fetch("/api/referrals/agreement", { method: "POST" });
    if (res.ok && profile) setProfile({ ...profile, referral_agreement_accepted_at: new Date().toISOString() });
    setAccepting(false);
  }

  function copyRoleLink(job: Job) {
    const link = `https://hraniti.com/r/${profile?.profile_slug ?? profile?.id.slice(0, 8)}/${job.referral_slug}`;
    navigator.clipboard.writeText(link);
    setCopiedSlug(job.id);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/referrals/network-import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImportResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImporting(false);
    }
  }

  async function findMatches() {
    setFinding(true);
    // Deterministic client-side match against loaded jobs by role text.
    const words = candidateRole.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matches = jobs
      .map((j) => ({
        job: j,
        score: words.filter((w) => `${j.title} ${j.career_track}`.toLowerCase().includes(w)).length,
      }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((m) => m.job);
    setMatchedJobs(matches);
    setFinding(false);
  }

  async function referToJob(job: Job | null) {
    if (!candidateEmail) {
      setError("Candidate email is required.");
      return;
    }
    setReferring(job?.id ?? "general");
    setError(null);
    try {
      const res = await fetch("/api/referrals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job?.id ?? null,
          candidateEmail,
          candidateName,
          candidatePhone,
          candidateLinkedin,
          candidateCurrentRole: candidateRole,
          referralType: job ? "resume_upload" : "general",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReferSuccess(`Referral sent for ${candidateName || candidateEmail}${job ? ` — ${job.title}` : ""}!`);
      setTimeout(() => setReferSuccess(null), 5000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReferring(null);
    }
  }

  async function searchCandidates() {
    if (searchQuery.trim().length < 3) return;
    const res = await fetch(`/api/referrals/search-candidate?q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.results ?? []);
  }

  if (loading || !profile) return <p className="font-mono text-sm text-ink-soft">Loading…</p>;

  if (!profile.referral_agreement_accepted_at) {
    return (
      <section className="paper-card p-6">
        <p className="text-sm text-ink-soft mb-4">
          Refer people you have worked with. Earn when they get hired. You remain in control.
        </p>
        <h2 className="font-medium text-ink mb-4">Before you refer someone, please confirm:</h2>
        <div className="space-y-3 mb-5">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={agreeKnow} onChange={(e) => setAgreeKnow(e.target.checked)} className="mt-0.5" />
            I know this candidate personally or professionally.
          </label>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={agreePermission} onChange={(e) => setAgreePermission(e.target.checked)} className="mt-0.5" />
            I have their permission to share their information with HRaniti.
          </label>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" checked={agreeRules} onChange={(e) => setAgreeRules(e.target.checked)} className="mt-0.5" />
            I understand the referral rules.
          </label>
        </div>
        <Button disabled={!agreeKnow || !agreePermission || !agreeRules} loading={accepting} onClick={acceptAgreement}>
          Accept & Continue
        </Button>
      </section>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft mb-6">
        Refer people you have worked with. Earn when they get hired. You remain in control.
      </p>

      {referSuccess && (
        <div className="bg-verified/10 border border-verified/30 text-verified text-sm rounded-lg px-4 py-3 mb-4">{referSuccess}</div>
      )}
      {error && <p className="text-sm text-alert mb-4">{error}</p>}

      {/* Card 1: General link */}
      <section className="paper-card p-6 mb-4">
        <h2 className="font-medium text-ink mb-3">Your General Referral Link</h2>
        <div className="flex items-center gap-2">
          <input
            value={`hraniti.com/r/${profile.profile_slug ?? profile.id.slice(0, 8)}`}
            disabled
            className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm bg-paper text-ink-soft"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`https://hraniti.com/r/${profile.profile_slug ?? profile.id.slice(0, 8)}`);
              setCopiedSlug("general");
              setTimeout(() => setCopiedSlug(null), 2000);
            }}
            className="p-2.5 rounded-lg border border-line hover:border-ink/40"
          >
            <Copy size={14} />
          </button>
          {copiedSlug === "general" && <span className="text-xs text-verified">Copied</span>}
        </div>
      </section>

      {/* Card 2: Role-specific links */}
      <section className="paper-card p-6 mb-4">
        <h2 className="font-medium text-ink mb-1">Role-Specific Referral Links</h2>
        <p className="text-xs text-ink-soft mb-3">Higher conversion — share the exact role.</p>
        <div className="space-y-2">
          {jobs.slice(0, 8).map((job) => (
            <div key={job.id} className="flex items-center justify-between border border-line rounded-lg px-3 py-2.5 flex-wrap gap-2">
              <div>
                <p className="text-sm text-ink">{job.title}</p>
                <p className="text-xs text-gold">Earn {formatINR(job.reward_amount_inr ?? 0)} • Paid after joining + probation</p>
              </div>
              <button
                onClick={() => copyRoleLink(job)}
                className="text-xs text-ink underline underline-offset-4 inline-flex items-center gap-1 shrink-0"
              >
                <Copy size={11} /> {copiedSlug === job.id ? "Copied!" : "Copy link"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Card 4: Import network */}
      <section className="paper-card p-6 mb-4">
        <h2 className="font-medium text-ink mb-3">Import Your Network</h2>
        <label className="border-2 border-dashed border-line rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-ink/40">
          <Upload size={20} className="text-ink-soft" />
          <span className="text-sm text-ink-soft">Drag & drop, or click to upload a .csv file</span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
        </label>
        {importing && <p className="text-xs text-ink-soft mt-3 font-mono">Scanning your file…</p>}
        {importResult && (
          <p className="text-sm text-ink mt-3">
            Imported: {importResult.imported} Contacts • Active Matches: {importResult.activeMatches}
          </p>
        )}
      </section>

      {/* Card 5: Upload resume and refer */}
      <section className="paper-card p-6 mb-4">
        <h2 className="font-medium text-ink mb-3">Upload Resume and Refer</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Full name" className="rounded-lg border border-line px-3 py-2.5 text-sm" />
          <input value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="Email (required)" className="rounded-lg border border-line px-3 py-2.5 text-sm" />
          <input value={candidatePhone} onChange={(e) => setCandidatePhone(e.target.value)} placeholder="Phone (optional)" className="rounded-lg border border-line px-3 py-2.5 text-sm" />
          <input value={candidateLinkedin} onChange={(e) => setCandidateLinkedin(e.target.value)} placeholder="LinkedIn URL (optional)" className="rounded-lg border border-line px-3 py-2.5 text-sm" />
          <input value={candidateRole} onChange={(e) => setCandidateRole(e.target.value)} placeholder="Current role (helps matching)" className="rounded-lg border border-line px-3 py-2.5 text-sm sm:col-span-2" />
        </div>
        <Button variant="secondary" loading={finding} onClick={findMatches} className="mb-3">
          Find Matching Roles
        </Button>
        {matchedJobs && (
          <div className="space-y-2">
            {matchedJobs.length === 0 && <p className="text-sm text-ink-soft italic">No strong matches found — you can still refer generally.</p>}
            {matchedJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between border border-line rounded-lg px-3 py-2.5 flex-wrap gap-2">
                <div>
                  <p className="text-sm text-ink">{job.title} · {job.company}</p>
                  <p className="text-xs text-gold">Earn {formatINR(job.reward_amount_inr ?? 0)}</p>
                </div>
                <Button loading={referring === job.id} onClick={() => referToJob(job)}>Refer to Role</Button>
              </div>
            ))}
            <Button variant="ghost" loading={referring === "general"} onClick={() => referToJob(null)}>
              Or refer generally (no specific role)
            </Button>
          </div>
        )}
      </section>

      {/* Card 6: Search existing candidate */}
      <section className="paper-card p-6">
        <h2 className="font-medium text-ink mb-3">Search Existing Candidate</h2>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchCandidates()}
            placeholder="Type candidate name or email"
            className="w-full rounded-lg border border-line pl-8 pr-3 py-2.5 text-sm"
          />
        </div>
        <div className="space-y-2">
          {searchResults.map((c) => (
            <div key={c.id} className="border border-line rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-ink">{c.full_name || c.email}</p>
                  <p className="text-xs text-ink-soft">{c.current_designation}{c.current_company ? ` at ${c.current_company}` : ""}</p>
                </div>
                <Button
                  onClick={() => {
                    setCandidateEmail(c.email);
                    setCandidateName(c.full_name ?? "");
                    referToJob(null);
                  }}
                >
                  Refer
                </Button>
              </div>
              <p className="text-xs text-ink-soft mt-2 bg-paper rounded-lg p-2">
                💡 This candidate is already part of the HRaniti network! You can still submit a recommendation to
                boost their visibility. Reward is eligible only if they haven't already applied or been referred for
                the specific role.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
