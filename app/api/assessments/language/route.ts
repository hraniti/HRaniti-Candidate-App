import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGE_QUESTIONS, LANGUAGE_SPOKEN_PROMPTS, scoreMCQ, toCEFRTier } from "@/lib/assessmentContent";
import { checkAssessmentEligibility } from "@/lib/assessmentEligibility";
import { SupportedLanguage, AssessmentResultFull } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const language = form.get("language") as SupportedLanguage;
  const answersRaw = form.get("answers") as string;
  const audioFile = form.get("audio") as File | null;

  if (!language || !LANGUAGE_QUESTIONS[language] || !answersRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Same reuse/cooldown rule as Domain/Behavioural, scoped to this language.
  const { data: pastResultsRaw } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", user.id)
    .eq("assessment_type", "Language");
  const relevant = ((pastResultsRaw ?? []) as AssessmentResultFull[]).filter((r) => r.language === language);
  const eligibility = checkAssessmentEligibility(relevant);
  if (!eligibility.canTake) {
    return NextResponse.json(
      {
        error:
          eligibility.reason === "valid_reuse"
            ? `Your ${language} assessment is already valid — no need to retake yet.`
            : `You can retake this in ${language} once your cooldown ends (${eligibility.cooldownEndsAt ? new Date(eligibility.cooldownEndsAt).toLocaleDateString() : "soon"}).`,
      },
      { status: 409 }
    );
  }

  const answers: number[] = JSON.parse(answersRaw);
  const writtenScore = scoreMCQ(LANGUAGE_QUESTIONS[language], answers);

  let spokenScore = writtenScore; // fallback if no audio or AI unavailable
  let spokenFeedback = "No spoken sample provided — score based on written section only.";
  let transcript = "";

  if (audioFile && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Upload audio to storage for record-keeping (small file, cheap).
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const path = `${user.id}/${Date.now()}-language-${language}.webm`;
      await supabase.storage.from("interview-media").upload(path, buffer, { contentType: audioFile.type });

      // Transcribe, then have the model evaluate fluency/pronunciation/clarity
      // from the transcript + knowing it's a spoken response (Whisper handles
      // audio directly; a text-only follow-up call estimates spoken quality
      // cheaply without needing raw audio analysis).
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });
      transcript = transcription.text;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content: `You are evaluating a spoken ${language} response to the prompt: "${LANGUAGE_SPOKEN_PROMPTS[language]}". Based on the transcript, rate fluency, clarity, and grammatical correctness. Respond with ONLY valid JSON: {"score": number (0-100), "feedback": string (1 sentence)}`,
          },
          { role: "user", content: transcript || "(empty or inaudible response)" },
        ],
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      spokenScore = parsed.score ?? writtenScore;
      spokenFeedback = parsed.feedback ?? spokenFeedback;
    } catch (e) {
      console.error("Language spoken evaluation failed:", e);
      // Fall back gracefully to written-only score rather than failing the whole assessment.
    }
  }

  const combinedScore = Math.round(writtenScore * 0.5 + spokenScore * 0.5);
  const tier = toCEFRTier(combinedScore);
  const passed = combinedScore >= 80;

  const now = new Date();
  const validUntil = passed ? new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString() : null;
  const cooldownUntil = !passed ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

  const { data: result, error } = await supabase
    .from("assessment_results")
    .insert({
      user_id: user.id,
      assessment_type: "Language",
      score: combinedScore,
      passed,
      tier,
      language,
      report: { written_score: writtenScore, spoken_score: spokenScore, spoken_feedback: spokenFeedback, transcript },
      valid_until: validUntil,
      cooldown_until: cooldownUntil,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Sync the verified proficiency back into Phase 2's Languages list, so this
  // assessment result is visible on the profile without duplicate data entry.
  const { data: profile } = await supabase.from("profiles").select("languages").eq("id", user.id).single();
  const existingLanguages = profile?.languages ?? [];
  const proficiencyMap: Record<string, string> = {
    A1: "Beginner", A2: "Beginner", B1: "Intermediate", B2: "Intermediate", C1: "Professional", C2: "Native",
  };
  const updatedLanguages = [
    ...existingLanguages.filter((l: any) => l.name !== language),
    { name: language, proficiency: proficiencyMap[tier] },
  ];
  await supabase.from("profiles").update({ languages: updatedLanguages }).eq("id", user.id);

  return NextResponse.json({ result });
}
