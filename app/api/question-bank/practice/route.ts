import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Paid-tier gate — Question Bank practice scoring is a subscription feature.
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  if (profile?.subscription_tier !== "paid") {
    return NextResponse.json({ error: "Practice scoring is a paid feature. Upgrade to unlock it." }, { status: 403 });
  }

  const { questionId, answer } = await req.json();
  if (!questionId || !answer?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: question } = await supabase.from("question_bank").select("*").eq("id", questionId).single();
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: `Score this practice interview answer against the model answer. Give a score 0-100 and 2-3 sentences of specific, actionable feedback. Respond with ONLY valid JSON: {"score": number, "feedback": string}`,
      },
      {
        role: "user",
        content: `Question: ${question.question_text}\nModel answer guidance: ${question.model_answer ?? "N/A"}\nCandidate's answer: ${answer}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Couldn't score this answer. Try again." }, { status: 502 });
  }
}
