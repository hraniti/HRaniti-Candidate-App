import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calcMatchScore } from "@/lib/jobMatching";
import { calcEmployerReadiness } from "@/lib/employerReadiness";
import { Profile, Job } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// Called once a day by Vercel Cron (see vercel.json). Uses the service-role
// key because it needs to read every candidate's profile, not just the
// caller's own — this is the one legitimate server-only use of that key in
// the whole app, and it never runs in a browser context.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "Digest not configured (missing service role or Resend key)." });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Only candidates who opted into Daily (Instant/Weekly batching is a
  // roadmap refinement — MVP sends the daily batch to everyone who wants any
  // digest at all except those who chose Off).
  const { data: profiles } = await admin
    .from("profiles")
    .select("*")
    .neq("digest_frequency", "Off")
    .eq("receive_match_alerts", true)
    .eq("show_profile_to_recruiters", true);

  const { data: jobs } = await admin.from("jobs").select("*");
  if (!profiles || !jobs) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const profile of profiles as Profile[]) {
    const scored = (jobs as Job[]).map((j) => ({ job: j, score: calcMatchScore(profile, j) }));
    const excellent = scored.filter((s) => s.score >= 90).length;
    const urgent = scored.filter((s) => s.job.urgent_hiring && s.score >= 60).length;
    const readiness = calcEmployerReadiness(profile);

    if (excellent === 0 && urgent === 0) continue; // nothing worth emailing about today

    await sendDigestEmail(profile, excellent, urgent, readiness);
    sent++;
  }

  return NextResponse.json({ sent });
}

async function sendDigestEmail(profile: Profile, excellent: number, urgent: number, readiness: number) {
  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <p>Good morning ${firstName} 👋</p>
      <h2>Today's Opportunities</h2>
      ${excellent > 0 ? `<p>⭐ ${excellent} Excellent Match${excellent === 1 ? "" : "es"}</p>` : ""}
      ${urgent > 0 ? `<p>🔥 ${urgent} Urgent Hiring Job${urgent === 1 ? "" : "s"}</p>` : ""}
      ${readiness < 95 ? `<p>🎯 Complete your profile to unlock more jobs (currently ${readiness}% ready)</p>` : ""}
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/jobs">View All Matches →</a></p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HRaniti <digest@hraniti.com>",
      to: profile.email,
      subject: `${excellent + urgent} new opportunities for you on HRaniti`,
      html,
    }),
  });
}
