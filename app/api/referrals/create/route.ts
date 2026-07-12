import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReferralSlug } from "@/lib/referralMatching";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("email, referral_agreement_accepted_at").eq("id", user.id).single();
  if (!profile?.referral_agreement_accepted_at) {
    return NextResponse.json({ error: "Please accept the referral agreement first." }, { status: 403 });
  }

  const body = await req.json();
  const {
    jobId,
    candidateEmail,
    candidateName,
    candidatePhone,
    candidateLinkedin,
    candidateCurrentRole,
    referralType,
    recommendationNote,
  } = body;

  if (!candidateEmail) return NextResponse.json({ error: "Candidate email is required" }, { status: 400 });

  // Self-referral is never allowed.
  if (profile.email && candidateEmail.toLowerCase() === profile.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't refer yourself." }, { status: 400 });
  }

  if (recommendationNote && recommendationNote.length > 300) {
    return NextResponse.json({ error: "Recommendation note must be 300 characters or fewer." }, { status: 400 });
  }

  let rewardTier: string | null = null;
  let rewardAmount: number | null = null;

  if (jobId) {
    const { data: job } = await supabase.from("jobs").select("reward_tier, reward_amount_inr").eq("id", jobId).single();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    rewardTier = job.reward_tier;
    rewardAmount = job.reward_amount_inr;

    // One reward per candidate per job requisition — and reward is only
    // eligible if the candidate hasn't already applied or already been
    // referred for this specific job by anyone.
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("job_id", jobId)
      .ilike("candidate_email", candidateEmail)
      .maybeSingle();
    if (existingReferral) {
      return NextResponse.json(
        { error: "This candidate has already been referred for this role by someone." },
        { status: 409 }
      );
    }

    const { data: existingCandidateProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", candidateEmail)
      .maybeSingle();
    if (existingCandidateProfile) {
      const { data: existingApplication } = await supabase
        .from("applications")
        .select("id")
        .eq("job_id", jobId)
        .eq("user_id", existingCandidateProfile.id)
        .maybeSingle();
      if (existingApplication) {
        return NextResponse.json(
          { error: "This candidate has already applied to this role — reward isn't eligible." },
          { status: 409 }
        );
      }
    }
  }

  const { data: referral, error } = await supabase
    .from("referrals")
    .insert({
      referrer_id: user.id,
      job_id: jobId ?? null,
      candidate_email: candidateEmail,
      candidate_name: candidateName ?? null,
      candidate_phone: candidatePhone ?? null,
      candidate_linkedin: candidateLinkedin ?? null,
      candidate_current_role: candidateCurrentRole ?? null,
      referral_type: referralType ?? "general",
      slug: generateReferralSlug(),
      status: "Shared",
      reward_tier: rewardTier,
      reward_amount_inr: rewardAmount,
      recommendation_note: recommendationNote ?? null,
      agreement_accepted_at: profile.referral_agreement_accepted_at,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referral });
}
