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

  const { applicationId } = await req.json();
  if (!applicationId) return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });

  const { data: application } = await supabase
    .from("applications")
    .select("*, job:jobs(*)")
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .single();

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (application.status !== "Interview Scheduled") {
    return NextResponse.json({ error: "No interview scheduled for this application yet." }, { status: 400 });
  }

  // Generated once, cached forever after that (matches the spec's "Generated on"
  // trust signal — the note shouldn't silently change between visits).
  if (application.interview_cheat_sheet) {
    return NextResponse.json({ cheatSheet: application.interview_cheat_sheet, cached: true });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const job = application.job;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    max_tokens: 80,
    messages: [
      {
        role: "system",
        content:
          "Write ONE short, specific interview prep tip (1-2 sentences) for a candidate interviewing for this role, based on the job description and required skills. Sound like an insider tip, not generic advice. Respond with ONLY the tip.",
      },
      {
        role: "user",
        content: `Job: ${job.title} at ${job.company}\nDescription: ${job.description}\nRequired skills: ${(job.required_skills ?? []).join(", ")}`,
      },
    ],
  });

  const cheatSheet = {
    note: completion.choices[0]?.message?.content?.trim() ?? "",
    generated_at: new Date().toISOString(),
  };

  await supabase.from("applications").update({ interview_cheat_sheet: cheatSheet }).eq("id", applicationId);

  return NextResponse.json({ cheatSheet, cached: false });
}
