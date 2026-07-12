import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { trustedReferrerLevel, LEVEL_ICON } from "@/lib/referralRewards";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const jobSlug = searchParams.get("job");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Landing pages aren't configured yet." }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: referrer } = await admin
    .from("profiles")
    .select("id, full_name, lifetime_referral_earnings")
    .eq("profile_slug", slug)
    .maybeSingle();

  if (!referrer) return NextResponse.json({ error: "Referral link not found" }, { status: 404 });

  // Count successful (Paid) referrals to derive the trusted level shown publicly.
  const { count: successfulHires } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrer.id)
    .eq("status", "Paid");

  const level = trustedReferrerLevel(successfulHires ?? 0);

  let job = null;
  if (jobSlug) {
    const { data: j } = await admin
      .from("jobs")
      .select("id, title, company, location, reward_tier, reward_amount_inr, referral_slug")
      .eq("referral_slug", jobSlug)
      .maybeSingle();
    job = j;
  }

  return NextResponse.json({
    referrer: { id: referrer.id, name: referrer.full_name, level, levelIcon: LEVEL_ICON[level] },
    job,
  });
}
