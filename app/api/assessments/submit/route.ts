import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOMAIN_QUESTIONS, BEHAVIOURAL_QUESTIONS, behaviouralProfile, scoreMCQ } from "@/lib/assessmentContent";
import { checkAssessmentEligibility } from "@/lib/assessmentEligibility";
import { CareerTrack, AssessmentResultFull } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { type, answers, careerTrack } = (await req.json()) as {
    type: "Domain" | "Behavioural";
    answers: number[];
    careerTrack?: CareerTrack;
  };

  if (!["Domain", "Behavioural"].includes(type)) {
    return NextResponse.json({ error: "Invalid assessment type" }, { status: 400 });
  }

  // Server-side reuse/cooldown enforcement — never trust the client on this,
  // since a stale UI state or a direct API call could otherwise bypass it.
  const { data: pastResultsRaw } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", user.id)
    .eq("assessment_type", type);

  const relevant = ((pastResultsRaw ?? []) as AssessmentResultFull[]).filter((r) =>
    type === "Domain" ? r.career_track === careerTrack : true
  );
  const eligibility = checkAssessmentEligibility(relevant);
  if (!eligibility.canTake) {
    return NextResponse.json(
      {
        error:
          eligibility.reason === "valid_reuse"
            ? "You've already passed this — it's still valid, no need to retake yet."
            : `You can retake this assessment once your cooldown ends (${eligibility.cooldownEndsAt ? new Date(eligibility.cooldownEndsAt).toLocaleDateString() : "soon"}).`,
      },
      { status: 409 }
    );
  }

  let score: number;
  let passed: boolean;
  let report: Record<string, any> | null = null;

  if (type === "Domain") {
    if (!careerTrack || !DOMAIN_QUESTIONS[careerTrack]) {
      return NextResponse.json({ error: "Missing or invalid career track" }, { status: 400 });
    }
    score = scoreMCQ(DOMAIN_QUESTIONS[careerTrack], answers);
    passed = score >= 80;
  } else {
    // Behavioural has no pass/fail — it's a profile, always "completed".
    const profile = behaviouralProfile(answers);
    score = 100;
    passed = true;
    report = { traits: profile, dominant: profile.sort((a, b) => b.score - a.score)[0]?.trait };
  }

  const now = new Date();
  const validUntil = passed ? new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString() : null;
  const cooldownUntil = !passed ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

  const { data: result, error } = await supabase
    .from("assessment_results")
    .insert({
      user_id: user.id,
      assessment_type: type,
      score,
      passed,
      career_track: type === "Domain" ? careerTrack : null,
      report,
      valid_until: validUntil,
      cooldown_until: cooldownUntil,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result });
}
