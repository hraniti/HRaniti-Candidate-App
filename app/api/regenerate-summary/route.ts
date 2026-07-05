import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODE_INSTRUCTIONS: Record<string, string> = {
  professional:
    "Write a polished, career-focused professional summary (2-4 sentences) suitable for a human recruiter to read. Confident, specific, no buzzword soup.",
  ats: "Write a keyword-dense professional summary (2-4 sentences) optimized for an Applicant Tracking System, naturally incorporating the candidate's key skills and job titles as searchable terms, while still reading as real sentences.",
  custom: "Write a professional summary (2-4 sentences) following this specific instruction from the candidate: ",
};

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { mode, customPrompt } = await req.json();
  if (!["professional", "ats", "custom"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  if (mode === "custom" && !customPrompt?.trim()) {
    return NextResponse.json({ error: "Add a custom instruction first" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, career_track, experience, skills, education, professional_summary")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const instruction =
    mode === "custom" ? MODE_INSTRUCTIONS.custom + customPrompt : MODE_INSTRUCTIONS[mode];

  const context = `
Candidate: ${profile.full_name ?? "Unknown"}
Career track: ${profile.career_track ?? "Unknown"}
Skills: ${(profile.skills ?? []).join(", ")}
Experience: ${JSON.stringify(profile.experience ?? [])}
Education: ${JSON.stringify(profile.education ?? [])}
Current summary (may be empty): ${profile.professional_summary ?? ""}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `You write resume professional summaries. ${instruction} Respond with ONLY the summary text, no preamble, no quotation marks.`,
      },
      { role: "user", content: context },
    ],
  });

  const summary = completion.choices[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ summary });
}
