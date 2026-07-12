import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { AIInterviewTranscriptEntry, AssessmentResultFull } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { resultId, transcript } = (await req.json()) as {
    resultId: string;
    transcript: AIInterviewTranscriptEntry[];
  };
  if (!resultId || !transcript) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: existing } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("id", resultId)
    .eq("user_id", user.id)
    .single();

  if (!existing) return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  const report = (existing as AssessmentResultFull).report;
  if (report.status === "completed") {
    return NextResponse.json({ error: "This interview is already completed." }, { status: 409 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const qaText = transcript
    .map(
      (t, i) =>
        `Q${i + 1} (${report.questions[i]?.category ?? "General"}): ${t.question}\nFollow-up: ${t.followUp}\nAnswer: ${t.skipped ? "(skipped)" : t.answer}`
    )
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You evaluate a candidate's interview transcript across four dimensions, each scored 0-100:
- technical: depth and accuracy of technical/domain answers
- behavioural: quality of past-experience answers (ownership, specificity, structure)
- communication: clarity, conciseness, structure of all answers
- specificity: how concrete vs vague the answers are (numbers, named examples, real outcomes vs generalities)
Also compute an overall score (weighted average is fine) and one short observation per question (what was strong or missing — one sentence each).
Skipped questions should reduce specificity and overall score somewhat but not technical/behavioural if other answers cover those areas.
Respond with ONLY valid JSON: { "scores": { "overall": number, "technical": number, "behavioural": number, "communication": number, "specificity": number }, "notes": [ { "questionId": string, "observation": string } ] }`,
      },
      { role: "user", content: qaText },
    ],
    response_format: { type: "json_object" },
  });

  let evaluation;
  try {
    evaluation = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    return NextResponse.json({ error: "Couldn't score your interview. Try finishing again." }, { status: 500 });
  }

  const updatedReport = {
    ...report,
    status: "completed",
    transcript,
    scores: evaluation.scores,
    notes: evaluation.notes,
  };

  const validUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  const { data: result, error } = await supabase
    .from("assessment_results")
    .update({
      score: evaluation.scores?.overall ?? 0,
      passed: true,
      completed_at: new Date().toISOString(),
      valid_until: validUntil,
      report: updatedReport,
    })
    .eq("id", resultId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result });
}
