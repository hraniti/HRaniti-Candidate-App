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

  // Paid-tier gate — Mock Interview is a subscription feature per spec.
  const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
  if (profile?.subscription_tier !== "paid") {
    return NextResponse.json({ error: "Mock Interview is a paid feature. Upgrade to unlock unlimited practice." }, { status: 403 });
  }

  const form = await req.formData();
  const companyName = form.get("companyName") as string;
  const language = form.get("language") as string;
  const difficulty = form.get("difficulty") as string;
  const interviewTypes = JSON.parse((form.get("interviewTypes") as string) || "[]");
  let jobDescription = (form.get("jobDescriptionText") as string) || "";
  const file = form.get("jobDescriptionFile") as File | null;

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const pdfParse = (await import("pdf-parse")).default;
        jobDescription = (await pdfParse(buffer)).text;
      } else if (file.name.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        jobDescription = (await mammoth.extractRawText({ buffer })).value;
      }
    } catch {
      // Fall through with whatever text was pasted, if any.
    }
  }

  if (!jobDescription.trim() || interviewTypes.length === 0) {
    return NextResponse.json({ error: "Add a job description and select at least one interview type." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI isn't configured yet." }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `Generate 5 realistic interview questions for a candidate interviewing at ${companyName || "a company"}, based on the job description below. Cover these interview types: ${interviewTypes.join(", ")}. Difficulty level: ${difficulty}. Respond with ONLY valid JSON: {"questions": [{"question": string, "type": string}]}`,
      },
      { role: "user", content: jobDescription.slice(0, 6000) },
    ],
    response_format: { type: "json_object" },
  });

  let questions;
  try {
    questions = JSON.parse(completion.choices[0]?.message?.content ?? "{}").questions;
  } catch {
    return NextResponse.json({ error: "Couldn't generate questions. Try again." }, { status: 502 });
  }

  const { data: interview, error } = await supabase
    .from("mock_interview_results")
    .insert({
      user_id: user.id,
      interview_types: interviewTypes,
      job_description: jobDescription.slice(0, 6000),
      company_name: companyName,
      language: language || "English",
      difficulty: difficulty || "Intermediate",
      status: "In Progress",
      questions,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ interview });
}
