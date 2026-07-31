"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Job, Profile } from "@/lib/types";
import { calcMatchScore, matchTier, calcApplicationReadiness } from "@/lib/jobMatching";
import { formatSalary } from "@/lib/currency";
import MatchBadge from "@/components/jobs/MatchBadge";
import SkillChip from "@/components/jobs/SkillChip";
import QuickApplyModal from "@/components/jobs/QuickApplyModal";
import Button from "@/components/Button";
import CandidateShell from "@/components/CandidateShell";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Globe,
  Users,
  MapPin,
  Copy,
  Linkedin,
  MessageCircle,
  Mail,
  ArrowRight,
} from "lucide-react";

type DetailTab = "gap" | "company" | "refer";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("gap");
  const [showApply, setShowApply] = useState(false);
  const [whyFit, setWhyFit] = useState<string | null>(null);
  const [cameFrom, setCameFrom] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [assessmentType, setAssessmentType] = useState("Domain");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: j }, { data: p }, { data: jobs }, { data: applied }] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", jobId).single(),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("jobs").select("*"),
        supabase.from("applications").select("id").eq("user_id", user.id).eq("job_id", jobId).maybeSingle(),
      ]);

      setJob(j as Job);
      setProfile(p as Profile);
      setAllJobs((jobs as Job[]) ?? []);
      setAlreadyApplied(!!applied);

      const prevViews = (p as Profile)?.recent_job_views ?? [];
      const prevTop = prevViews.find((v) => v.id !== jobId);
      if (prevTop) setCameFrom(prevTop.title);

      // Record this view for future "because you viewed" context, and fetch the
      // cached (or freshly generated) Why You Fit paragraph.
      if (j) {
        fetch("/api/jobs/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, jobTitle: j.title }),
        });
        fetch("/api/jobs/ai-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, type: "why_fit" }),
        })
          .then((r) => r.json())
          .then((d) => setWhyFit(d.content?.text ?? null))
          .catch(() => {});
      }

      setLoading(false);
    })();
  }, [jobId]);

  const similarJobs = useMemo(() => {
    if (!job) return [];
    return allJobs.filter((j) => j.id !== job.id && j.career_track === job.career_track).slice(0, 3);
  }, [job, allJobs]);

  const readiness = profile ? calcApplicationReadiness(profile) : null;

  if (loading || !job || !profile) {
    return (
      <CandidateShell>
        <div className="px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-sm text-ink-soft">Loading job…</p>
        </div>
        </div>
      </CandidateShell>
    );
  }

  const score = calcMatchScore(profile, job);
  const tier = matchTier(score);
  const referralUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/jobs/${job.id}?ref=${job.referral_slug ?? job.id.slice(0, 8)}`;

  return (
    <CandidateShell>
      <div className="px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">

        <button onClick={() => router.back()} className="text-sm text-ink-soft mb-4 hover:text-ink">
          ← Back
        </button>

        <div className="paper-card p-6 mb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="font-display text-2xl text-ink mb-1">{job.title}</h1>
              <p className="text-ink-soft">
                {job.company} · {job.location}
              </p>
            </div>
            <MatchBadge tier={tier} score={score} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft mt-3">
            <span>{job.employment_type}</span>
            <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
            <span>{job.work_mode}</span>
            {job.visa_sponsorship && <span>Visa sponsorship available</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {([
            ["gap", "Job & AI Gap"],
            ["company", "Company Insight"],
            ["refer", "Refer & Share"],
          ] as [DetailTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                tab === key ? "bg-ink text-white border-ink" : "bg-white text-ink-soft border-line"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "gap" && (
          <div>
            {/* Application readiness */}
            {readiness && (
              <section className="paper-card p-6 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">Application Readiness</p>
                  <p className="font-mono text-sm text-ink">{readiness.score}%</p>
                </div>
                <div className="h-2 w-full bg-line rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full ${readiness.score >= 80 ? "bg-verified" : "bg-gold"}`}
                    style={{ width: `${readiness.score}%` }}
                  />
                </div>
                <p className="text-xs text-ink-soft flex items-center gap-1 mb-3">
                  <Clock size={12} /> Estimated application time: {readiness.estimatedSeconds} seconds
                </p>
                <div className="space-y-1.5">
                  {readiness.items.map((i) => (
                    <div key={i.key} className="flex items-center gap-2 text-sm">
                      {i.ok ? <CheckCircle2 size={14} className="text-verified" /> : <XCircle size={14} className="text-alert" />}
                      <span className={i.ok ? "text-ink" : "text-ink-soft"}>
                        {i.ok ? i.label : `Missing: ${i.label}`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Vetting checklist */}
            <section className="paper-card p-6 mb-4">
              <h2 className="font-medium text-ink mb-3">Get vetted for this role</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">Resume</span>
                  {profile.resume_uploaded ? (
                    <CheckCircle2 size={15} className="text-verified" />
                  ) : (
                    <button onClick={() => router.push("/onboarding/resume")} className="text-xs text-ink underline underline-offset-4">
                      Upload now
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm gap-3">
                  <span className="text-ink">Assessment</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={assessmentType}
                      onChange={(e) => setAssessmentType(e.target.value)}
                      className="text-xs rounded-md border border-line px-2 py-1 bg-white"
                    >
                      <option>Domain</option>
                      <option>Behavioural</option>
                      <option>Language</option>
                    </select>
                    <button
                      onClick={() => router.push("/interview-hub")}
                      className="text-xs text-ink underline underline-offset-4"
                    >
                      Take assessment →
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">Profile completeness</span>
                  <button onClick={() => router.push("/profile")} className="text-xs text-ink underline underline-offset-4 inline-flex items-center gap-1">
                    View My Profile <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </section>

            {/* AI Why You Fit */}
            <section className="paper-card p-6 mb-4">
              <h2 className="inline-flex items-center gap-1.5 font-medium text-ink mb-2">
                <Sparkles size={14} className="text-gold" /> Why you fit
              </h2>
              <p className="text-sm text-ink-soft">{whyFit ?? "Generating your personalized fit summary…"}</p>
            </section>

            {/* Interactive skills */}
            <section className="paper-card p-6 mb-4">
              <h2 className="font-medium text-ink mb-3">Skills for this role</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                {(job.required_skills ?? []).map((s) => <SkillChip key={s} label={s} weight="required" />)}
                {(job.preferred_skills ?? []).map((s) => <SkillChip key={s} label={s} weight="preferred" />)}
                {(job.nice_to_have_skills ?? []).map((s) => <SkillChip key={s} label={s} weight="nice_to_have" />)}
              </div>
              <p className="text-[11px] text-ink-soft mt-2">Solid = required · Outlined = preferred · Dashed = nice to have</p>
            </section>

            {/* Quick apply CTA */}
            <section className="paper-card p-6 mb-4">
              {alreadyApplied ? (
                <p className="text-sm text-verified inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> You've applied to this job.
                </p>
              ) : (
                <Button className="w-full justify-center" onClick={() => setShowApply(true)}>
                  Quick Apply
                </Button>
              )}
              <p className="text-xs text-ink-soft mt-2 text-center">
                Expected review timeline: {job.expected_review_timeline}
              </p>
            </section>

            {/* Similar jobs */}
            {similarJobs.length > 0 && (
              <section className="paper-card p-6">
                <h2 className="font-medium text-ink mb-1">Similar jobs</h2>
                <p className="text-xs text-ink-soft mb-3">
                  {cameFrom ? `Because you viewed ${cameFrom}` : `More in ${job.career_track}`}
                </p>
                <div className="space-y-2">
                  {similarJobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => router.push(`/jobs/${j.id}`)}
                      className="w-full text-left border border-line rounded-lg px-3 py-2 hover:border-ink/40"
                    >
                      <p className="text-sm text-ink">{j.title}</p>
                      <p className="text-xs text-ink-soft">{j.company} · {j.location}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "company" && (
          <div className="space-y-4">
            <section className="paper-card p-6">
              <h2 className="font-medium text-ink mb-2">{job.company}</h2>
              <p className="text-sm text-ink-soft mb-4">{job.company_description}</p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-ink-soft">Industry: </span>{job.industry}</div>
                <div className="inline-flex items-center gap-1.5"><Users size={13} className="text-ink-soft" />{job.company_size}</div>
                <div className="inline-flex items-center gap-1.5 sm:col-span-2">
                  <MapPin size={13} className="text-ink-soft" /> {(job.locations ?? []).join(", ")}
                </div>
                {job.website && (
                  <a href={job.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-ink underline underline-offset-4">
                    <Globe size={13} /> Visit website
                  </a>
                )}
              </div>
            </section>

            {(job.perks ?? []).length > 0 && (
              <section className="paper-card p-6">
                <h2 className="font-medium text-ink mb-3">Perks & benefits</h2>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm text-ink-soft">
                  {job.perks.map((p) => <li key={p}>• {p}</li>)}
                </ul>
              </section>
            )}

            {job.hiring_team && job.hiring_team.length > 0 && (
              <section className="paper-card p-6">
                <h2 className="font-medium text-ink mb-3">Hiring team</h2>
                {job.hiring_team.map((h) => (
                  <p key={h.name} className="text-sm text-ink-soft">{h.name} — {h.role}</p>
                ))}
              </section>
            )}

            <section className="paper-card p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-soft">Employer response rate</p>
                <span className="text-[11px] font-mono text-ink-soft">Roadmap</span>
              </div>
              <p className="text-xs text-ink-soft mt-1">Not enough data yet to show this reliably.</p>
            </section>
          </div>
        )}

        {tab === "refer" && (
          <section className="paper-card p-6">
            <h2 className="font-medium text-ink mb-3">Refer someone for this role</h2>
            <div className="flex items-center gap-2 mb-4">
              <input value={referralUrl} disabled className="flex-1 rounded-lg border border-line px-3 py-2.5 text-sm bg-paper text-ink-soft" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2.5 rounded-lg border border-line hover:border-ink/40"
              >
                <Copy size={14} />
              </button>
              {copied && <span className="text-xs text-verified">Copied</span>}
            </div>
            <div className="flex gap-3 flex-wrap">
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`}
                target="_blank" rel="noreferrer"
              >
                <Button variant="secondary"><Linkedin size={14} /> Share on LinkedIn</Button>
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Check out this role: ${job.title} at ${job.company} — ${referralUrl}`)}`} target="_blank" rel="noreferrer">
                <Button variant="secondary"><MessageCircle size={14} /> Share on WhatsApp</Button>
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(`Job opportunity: ${job.title}`)}&body=${encodeURIComponent(referralUrl)}`}>
                <Button variant="secondary"><Mail size={14} /> Share via Email</Button>
              </a>
            </div>
          </section>
        )}

        {showApply && (
          <QuickApplyModal
            job={job}
            profile={profile}
            onClose={() => setShowApply(false)}
            onSubmitted={() => {
              setAlreadyApplied(true);
              setShowApply(false);
            }}
          />
        )}
      </div>
    </div>
    </CandidateShell>
  );
}
