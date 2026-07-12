import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReferralSlug } from "@/lib/referralMatching";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { referrerSlug, jobSlug } = await req.json();
  if (!referrerSlug) return NextResponse.json({ error: "Missing referrer" }, { status: 400 });

  const { data: referrer } = await supabase.from("profiles").select("id, email").eq("profile_slug", referrerSlug).maybeSingle();
  if (!referrer || referrer.id === user.id) {
    // Unknown referrer, or someone somehow referred themselves — quietly skip.
    return NextResponse.json({ attributed: false });
  }

  let jobId: string | null = null;
  if (jobSlug) {
    const { data: job } = await supabase.from("jobs").select("id, reward_tier, reward_amount_inr").eq("referral_slug", jobSlug).maybeSingle();
    jobId = job?.id ?? null;
    var rewardTier = job?.reward_tier ?? null;
    var rewardAmount = job?.reward_amount_inr ?? null;
  }

  // Avoid double-attribution if this route somehow runs twice for the same user.
  const { data: existing } = await supabase
    .from("referrals")
    .select("id")
    .eq("candidate_user_id", user.id)
    .eq("referrer_id", referrer.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ attributed: false, alreadyExists: true });

  const { data: userInfo } = await supabase.auth.getUser();
  const email = userInfo.user?.email ?? "";

  const { error } = await supabase.from("referrals").insert({
    referrer_id: referrer.id,
    job_id: jobId,
    candidate_email: email,
    candidate_user_id: user.id,
    referral_type: jobId ? "role_specific" : "general",
    slug: generateReferralSlug(),
    status: "Registered",
    reward_tier: typeof rewardTier !== "undefined" ? rewardTier : null,
    reward_amount_inr: typeof rewardAmount !== "undefined" ? rewardAmount : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attributed: true });
}
