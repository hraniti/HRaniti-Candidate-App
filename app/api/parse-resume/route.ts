import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCHEMA_INSTRUCTIONS = `
You extract structured candidate data from resume text. Respond with ONLY valid JSON
(no markdown fences, no commentary) matching this exact shape:

{
  "full_name": string,
  "email": string | null,
  "phone": string | null,
  "linkedin_url": string | null,
  "professional_summary": string,
  "career_track": one of ["ERP","Data & Analytics","AI / ML","Cloud / DevOps","Semiconductor & Embedded","Life Sciences & Pharma","Other Technology"],
  "education": [{ "degree": string, "institution": string, "field_of_study": string, "graduation_year": string }],
  "experience": [{ "company": string, "title": string, "start_date": string, "end_date": string, "description": string }],
  "skills": [string],
  "certifications": [{ "name": string, "provider": string, "credential_id": string | null }],
  "current_company": string | null,
  "current_designation": string | null,
  "current_location": string | null,
  "years_experience": string | null,
  "confidence": {
    "personal_info": number, "professional_summary": number, "experience": number,
    "education": number, "skills": number, "certifications": number
  }
}

Rules for the current_* fields (these power recruiter search filters, so accuracy matters):
- "current_company" and "current_designation" come from whichever experience entry has no
  end date, or an end date of "Present" / "Current" / similar — i.e. their most recent /
  ongoing role. If every role has a clear end date (no current role), use the most recent one
  and still fill these in, since the candidate is very likely job-searching from their last role.
- "current_location" is the candidate's city/region as stated in the resume header or most
  recent job entry, not the company's headquarters if those differ.
- "years_experience" is your best estimate of total professional experience as a short string
  like "5 years" or "8+ years", computed from the earliest start date to now (or to the latest
  end date if the candidate is not currently employed). Round to the nearest whole year.
- If the resume genuinely doesn't contain enough information for one of these fields, use null
  rather than guessing.

Confidence values are integers 0-100 reflecting how certain you are the extraction is accurate
given the source text (lower it when the resume is ambiguous, truncated, or missing a section).
`;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Throttle: block repeated uploads within a 15-minute window. This protects
  // against accidental button-spam (or deliberate abuse) driving up OpenAI costs
  // and thrashing the cached profile data on every re-click.
  const THROTTLE_MS = 15 * 60 * 1000;
  const { data: existing } = await supabase
    .from("profiles")
    .select("last_resume_upload_at")
    .eq("id", user.id)
    .single();

  if (existing?.last_resume_upload_at) {
    const elapsed = Date.now() - new Date(existing.last_resume_upload_at).getTime();
    if (elapsed < THROTTLE_MS) {
      const waitMinutes = Math.ceil((THROTTLE_MS - elapsed) / 60000);
      return NextResponse.json(
        { error: `You can upload a new resume again in about ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.` },
        { status: 429 }
      );
    }
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer });
      text = parsed.value;
    } else {
      return NextResponse.json(
        { error: "Only PDF and DOCX resumes are supported" },
        { status: 400 }
      );
    }
  } catch (e) {
    return NextResponse.json({ error: "Could not read that file" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Couldn't extract any text from that file" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Resume parsing isn't configured yet. Add OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SCHEMA_INSTRUCTIONS },
      { role: "user", content: text.slice(0, 15000) },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let structured;
  try {
    structured = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "AI returned an unreadable response" }, { status: 502 });
  }

  // Persist to the candidate's profile. We also snapshot the AI's raw output
  // (ai_snapshot) so Phase 2's "Restore AI Version" buttons have something to
  // revert to even after the candidate edits these fields by hand.
  await supabase
    .from("profiles")
    .update({
      full_name: structured.full_name,
      phone: structured.phone,
      linkedin_url: structured.linkedin_url,
      professional_summary: structured.professional_summary,
      career_track: structured.career_track,
      education: structured.education,
      experience: structured.experience,
      skills: structured.skills,
      certifications: structured.certifications,
      ai_confidence: structured.confidence,
      current_company: structured.current_company ?? null,
      current_designation: structured.current_designation ?? null,
      current_location: structured.current_location ?? null,
      years_experience: structured.years_experience ?? null,
      resume_uploaded: true,
      ai_snapshot: {
        professional_summary: structured.professional_summary,
        experience: structured.experience,
        skills: structured.skills,
        certifications: structured.certifications,
        education: structured.education,
      },
      ai_updated_at: new Date().toISOString(),
      last_resume_upload_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return NextResponse.json({ profile: structured });
}
