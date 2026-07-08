import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOMAIN_QUESTIONS, BEHAVIOURAL_QUESTIONS, LANGUAGE_QUESTIONS, LANGUAGE_SPOKEN_PROMPTS } from "@/lib/assessmentContent";
import { CareerTrack, SupportedLanguage } from "@/lib/types";

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // Domain | Behavioural | Language
  const track = searchParams.get("track") as CareerTrack | null;
  const language = searchParams.get("language") as SupportedLanguage | null;

  if (type === "Domain") {
    if (!track || !DOMAIN_QUESTIONS[track]) {
      return NextResponse.json({ error: "Unknown or missing career track" }, { status: 400 });
    }
    const questions = DOMAIN_QUESTIONS[track].map(({ id, question, options }) => ({ id, question, options }));
    return NextResponse.json({ questions });
  }

  if (type === "Behavioural") {
    const questions = BEHAVIOURAL_QUESTIONS.map(({ id, question, options }) => ({ id, question, options }));
    return NextResponse.json({ questions });
  }

  if (type === "Language") {
    if (!language || !LANGUAGE_QUESTIONS[language]) {
      return NextResponse.json({ error: "Unknown or missing language" }, { status: 400 });
    }
    const questions = LANGUAGE_QUESTIONS[language].map(({ id, question, options }) => ({ id, question, options }));
    return NextResponse.json({ questions, spokenPrompt: LANGUAGE_SPOKEN_PROMPTS[language] });
  }

  return NextResponse.json({ error: "Invalid assessment type" }, { status: 400 });
}
