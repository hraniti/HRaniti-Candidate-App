import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { whyThisJob, gapNudge, matchedSkillsCount } from "@/lib/jobMatching";
import { Job, Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type InsightType = "why_fit" | "explain_further" | "improve_match";

// "why_fit" is cached forever once generated (it's a stable 2-line summary of
// the candidate against this job). "explain_further" and "improve_match" are
// cheap enough to regenerate, but we still cache them for a day so re-opening
// the same job card doesn't burn another call.
const CACHE_TTL_MS: Record<InsightType, number> = {
  why_fit: Infinity,
  explain_further: 24 * 60 * 60 * 1000,
  improve_match: 24 * 60 * 60 * 1000,
};

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { jobId, type } = (await req.json()) as { jobId: string; type: InsightType };
  if (!jobId || !["why_fit", "explain_further", "improve_match"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Check cache first — this is the whole cost-control strategy for this route.
  const { data: cached } = await supabase
    .from("job_match_cache")
    .select("content, generated_at")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .eq("insight_type", type)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.generated_at).getTime();
    if (age < CACHE_TTL_MS[type]) {
      return NextResponse.json({ content: cached.content, cached: true });
    }
  }

  const [{ data: profile }, { data: job }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("jobs").select("*").eq("id", jobId).single(),
  ]);

  if (!profile || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const content = await generateInsight(type, profile as Profile, job as Job, openai);

  await supabase.from("job_match_cache").upsert(
    {
      user_id: user.id,
      job_id: jobId,
      insight_type: type,
      content,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,job_id,insight_type" }
  );

  return NextResponse.json({ content, cached: false });
}

async function generateInsight(type: InsightType, profile: Profile, job: Job, openai: OpenAI) {
  const checks = whyThisJob(profile, job);
  const nudge = gapNudge(profile, job);
  const { matched, total } = matchedSkillsCount(profile, job);

  const baseContext = `
Candidate career track: ${profile.career_track ?? "Unknown"}
Candidate skills: ${(profile.skills ?? []).join(", ")}
Candidate summary: ${profile.professional_summary ?? ""}
Job title: ${job.title} at ${job.company}
Job required skills: ${(job.required_skills ?? []).join(", ")}
Job description: ${job.description}
Deterministic checklist: ${checks.map((c) => `${c.label}: ${c.matched ? "match" : "no match"}`).join(", ")}
Matched skills: ${matched}/${total}
`;

  if (type === "why_fit") {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            "Write a warm, specific 2-sentence paragraph explaining why this candidate is a good fit for this job, based on the facts given. No fluff, no generic phrases. Respond with ONLY the paragraph.",
        },
        { role: "user", content: baseContext },
      ],
    });
    return { text: completion.choices[0]?.message?.content?.trim() ?? "" };
  }

  if (type === "explain_further") {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 160,
      messages: [
        {
          role: "system",
          content:
            "Explain in 3-4 sentences, specifically and honestly, why this match score is what it is — call out both strengths and any real gaps. Respond with ONLY the explanation.",
        },
        { role: "user", content: baseContext },
      ],
    });
    return { text: completion.choices[0]?.message?.content?.trim() ?? "" };
  }

  // improve_match
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 100,
    messages: [
      {
        role: "system",
        content: `Suggest ONE concrete, specific action the candidate could take to improve their match for this job (e.g. add a skill, adjust a preference). Also estimate their new match percentage as a number 1-15 points higher than their current match, realistically. Respond with ONLY valid JSON: {"suggestion": string, "estimated_gain": number}`,
      },
      { role: "user", content: baseContext + `\nGap nudge already identified: ${nudge ?? "none"}` },
    ],
    response_format: { type: "json_object" },
  });
  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    return { suggestion: nudge ?? "Keep your profile updated.", estimated_gain: 8 };
  }
}
