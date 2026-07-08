import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { interviewId, transcript, durationSeconds, proctoringFlags } = await req.json();
  if (!interviewId || !transcript) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: interview } = await supabase
    .from("mock_interview_results")
    .select("*")
    .eq("id", interviewId)
    .eq("user_id", user.id)
    .single();
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // One call for the entire feedback report — this is what keeps a full mock
  // interview under $0.05, per spec, instead of scoring each answer separately.
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content: `You are an interview coach reviewing a candidate's mock interview. Interview types covered: ${interview.interview_types.join(", ")}. For each answered question, give brief specific feedback. Score skipped questions as 0 and note them. Respond with ONLY valid JSON matching this shape:
{
  "overall_score": number (0-100),
  "breakdown": { "<interview type>": number, ... },
  "per_question": [{ "question": string, "strong": string, "weak": string, "suggestion": string }],
  "resources": [string, string]
}`,
      },
      { role: "user", content: JSON.stringify(transcript) },
    ],
    response_format: { type: "json_object" },
  });

  let feedback;
  try {
    feedback = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    return NextResponse.json({ error: "Couldn't generate feedback. Try again." }, { status: 502 });
  }

  const { data: updated, error } = await supabase
    .from("mock_interview_results")
    .update({
      status: "Completed",
      transcript,
      score: feedback.overall_score ?? null,
      feedback,
      duration_seconds: durationSeconds ?? null,
      proctoring_flags: proctoringFlags ?? interview.proctoring_flags,
      completed_at: new Date().toISOString(),
    })
    .eq("id", interviewId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ interview: updated });
}
