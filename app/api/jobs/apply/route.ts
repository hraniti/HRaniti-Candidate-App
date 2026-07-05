import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { matchedSkillsCount } from "@/lib/jobMatching";
import { Job, Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  // Daily limit: 20 applications, resets at 00:00 UTC. Saved jobs never touch
  // this table at all, so they're automatically excluded — no extra logic needed.
  const utcMidnight = new Date();
  utcMidnight.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("applied_at", utcMidnight.toISOString());

  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: "You've reached today's limit of 20 applications. This resets at midnight UTC." },
      { status: 429 }
    );
  }

  // "Not already applied" — the unique(user_id, job_id) constraint backs this up too.
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You've already applied to this job." }, { status: 409 });
  }

  const [{ data: profile }, { data: job }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("jobs").select("*").eq("id", jobId).single(),
  ]);
  if (!profile || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const aiMatchSummary = await buildMatchSummary(profile as Profile, job as Job);

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      job_id: jobId,
      status: "Applied",
      application_quality_score: aiMatchSummary.confidence,
      ai_match_summary: aiMatchSummary,
      expected_timeline: job.expected_review_timeline,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Increment applicant_count on the job for social-proof display elsewhere.
  await supabase
    .from("jobs")
    .update({ applicant_count: (job.applicant_count ?? 0) + 1 })
    .eq("id", jobId);

  return NextResponse.json({ application });
}

// Deterministic, no AI call — matches the spec's cost table ("~$0.005" is for
// the optional highlight sentence; the numbers themselves are computed, not
// generated, so a bad AI response can never corrupt an employer-facing score).
async function buildMatchSummary(profile: Profile, job: Job) {
  const { matched, total } = matchedSkillsCount(profile, job);
  const confidence = Math.round(
    (matched / Math.max(total, 1)) * 60 + (profile.career_track === job.career_track ? 25 : 0) + 15
  );

  const highlights: string[] = [];
  if (profile.years_experience) highlights.push(`${profile.years_experience} of relevant experience`);
  if (profile.current_designation) highlights.push(profile.current_designation);
  if ((profile.skills ?? []).length > 0) highlights.push(`Strong in ${(profile.skills ?? []).slice(0, 2).join(", ")}`);
  if (profile.availability_status === "Actively Looking") highlights.push("Immediate availability");
  if (job.visa_sponsorship || profile.visa_status === "Citizen" || profile.visa_status === "Permanent Resident") {
    highlights.push(`${job.locations?.[0] ?? job.location} eligible`);
  }

  return {
    highlights: highlights.slice(0, 4),
    matched_skills: matched,
    total_skills: total,
    confidence: Math.min(99, Math.max(40, confidence)),
    data_quality: profile.resume_uploaded ? "Verified" : "Unverified",
    resume_parsed: profile.ai_confidence
      ? Math.round(
          (profile.ai_confidence.personal_info +
            profile.ai_confidence.experience +
            profile.ai_confidence.skills) /
            3
        )
      : 0,
  };
}
