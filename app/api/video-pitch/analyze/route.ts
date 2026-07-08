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

  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  if (profile?.subscription_tier !== "paid") {
    return NextResponse.json({ error: "AI Coaching is a paid feature. Upgrade to unlock it." }, { status: 403 });
  }

  const form = await req.formData();
  const videoFile = form.get("video") as File | null;
  if (!videoFile) return NextResponse.json({ error: "No video provided" }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Transcribe the audio track for analysis — Whisper accepts video files directly.
  let transcript = "";
  try {
    const transcription = await openai.audio.transcriptions.create({ file: videoFile, model: "whisper-1" });
    transcript = transcription.text;
  } catch (e) {
    return NextResponse.json({ error: "Couldn't process that video file." }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `You're coaching a candidate on their 60-second video pitch introduction, based on its transcript. Give specific, actionable feedback. Respond with ONLY valid JSON: {"positives": [string], "improvements": [string], "tips": [string], "score": number (0-100)}. Keep each array to 1-2 items.`,
      },
      { role: "user", content: transcript || "(no speech detected)" },
    ],
    response_format: { type: "json_object" },
  });

  try {
    const feedback = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    return NextResponse.json({ feedback, transcript });
  } catch {
    return NextResponse.json({ error: "Couldn't generate coaching feedback." }, { status: 502 });
  }
}
