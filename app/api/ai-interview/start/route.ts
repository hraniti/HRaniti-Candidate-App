import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { AssessmentResultFull, Profile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_ATTEMPTS = 3;

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: pastRaw } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", user.id)
    .eq("assessment_type", "AI Interview");

  const past = (pastRaw ?? []) as AssessmentResultFull[];
  const completedAttempts = past.filter((r) => r.report?.status === "completed").length;
  const inProgress = past.find((r) => r.report?.status === "in_progress");

  // Resume an already-started, unfinished attempt rather than burning a new one.
  if (inProgress) {
    return NextResponse.json({ result: inProgress, resumed: true });
  }

  if (completedAttempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: `You've used all ${MAX_ATTEMPTS} attempts for this interview.` },
      { status: 409 }
    );
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const p = profile as Profile;
  const context = `
Candidate career track: ${p.career_track ?? "Unknown"}
Professional summary: ${p.professional_summary ?? ""}
Skills: ${(p.skills ?? []).join(", ")}
Experience: ${JSON.stringify((p.experience ?? []).slice(0, 3))}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `You design a single structured interview of 7 questions for a candidate, based on their resume. Generate exactly this mix:
- 2 questions grounded in their specific resume (ask about a real project, role, or claim they made)
- 2 technical/domain questions relevant to their career track
- 2 behavioural questions (STAR-style, about past work situations)
- 1 situational/hypothetical question

For EACH question, also write ONE probing follow-up that would dig deeper into whatever a candidate typically says — this simulates a real interviewer's follow-up without needing a live conversation.

Respond with ONLY valid JSON: { "questions": [ { "question": string, "followUp": string, "category": "Resume"|"Technical"|"Behavioural"|"Situational" } ] }`,
      },
      { role: "user", content: context },
    ],
    response_format: { type: "json_object" },
  });

  let generated;
  try {
    generated = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    return NextResponse.json({ error: "Couldn't generate your interview questions. Try again." }, { status: 500 });
  }

  const questions = (generated.questions ?? []).map((q: any, i: number) => ({
    id: `q${i + 1}`,
    question: q.question,
    followUp: q.followUp,
    category: q.category,
  }));

  const { data: result, error } = await supabase
    .from("assessment_results")
    .insert({
      user_id: user.id,
      assessment_type: "AI Interview",
      score: 0,
      passed: false,
      career_track: p.career_track,
      report: {
        status: "in_progress",
        questions,
        transcript: [],
        scores: null,
        notes: null,
        attempt_number: completedAttempts + 1,
      },
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result, resumed: false });
}
