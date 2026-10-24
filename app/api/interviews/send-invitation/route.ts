import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

export const runtime = "nodejs";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] as string));

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email sending is not configured yet. Add RESEND_API_KEY in Vercel and redeploy." }, { status: 503 });

  let body: { interviewId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!body.interviewId) return NextResponse.json({ error: "Interview ID is required." }, { status: 400 });

  let companyId: string;
  try { companyId = await getOrCreateCompanyId(supabase, user); }
  catch { return NextResponse.json({ error: "Could not verify your employer workspace." }, { status: 403 }); }

  const { data: interview, error: interviewError } = await supabase
    .from("interview_requests")
    .select("id,application_id,status,proposed_times,confirmed_time,interview_type,interview_mode,duration_minutes,timezone,meeting_link,meeting_provider,interviewer_ids,external_interviewers,notes")
    .eq("id", body.interviewId).maybeSingle();
  if (interviewError || !interview) return NextResponse.json({ error: "Interview not found or you do not have access." }, { status: 404 });

  const { data: application } = await supabase.from("applications")
    .select("id,user_id,job_id").eq("id", interview.application_id).maybeSingle();
  if (!application) return NextResponse.json({ error: "Candidate application not found." }, { status: 404 });
  const { data: job } = await supabase.from("jobs")
    .select("id,title,company_id").eq("id", application.job_id).eq("company_id", companyId).maybeSingle();
  if (!job) return NextResponse.json({ error: "This interview does not belong to your workspace." }, { status: 403 });
  const { data: candidate } = await supabase.from("profiles")
    .select("id,full_name,email").eq("id", application.user_id).maybeSingle();
  if (!candidate?.email) return NextResponse.json({ error: "The candidate has no email address on their profile." }, { status: 422 });

  const startValue = interview.confirmed_time || interview.proposed_times?.[0];
  if (!startValue) return NextResponse.json({ error: "Add an interview date and time before sending the invitation." }, { status: 422 });
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return NextResponse.json({ error: "The interview date is invalid." }, { status: 422 });
  const end = new Date(start.getTime() + (interview.duration_minutes || 60) * 60000);
  const dateTime = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full", timeStyle: "short", timeZone: interview.timezone || "UTC",
  }).format(start);
  const safeName = escapeHtml(candidate.full_name || "there");
  const safeJob = escapeHtml(job.title || "the role");
  const meeting = interview.meeting_link
    ? '<p><a href="' + escapeHtml(interview.meeting_link) + '">Join interview</a></p>'
    : "";
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#173454;line-height:1.6">
    <p>Hello ${safeName},</p><h2>Interview invitation</h2>
    <p>Your interview for <strong>${safeJob}</strong> has been scheduled with HRANITI.</p>
    <p><strong>Type:</strong> ${escapeHtml(interview.interview_type || "Interview")}<br>
    <strong>When:</strong> ${escapeHtml(dateTime)} (${interview.duration_minutes || 60} minutes)<br>
    <strong>Mode:</strong> ${escapeHtml(interview.interview_mode || "Online")}</p>
    ${meeting}<p>Please reply to your recruiter if you need to request a different time.</p>
    <p>Kind regards,<br>HRANITI Hiring Team</p></div>`;
  const from = process.env.RESEND_FROM_EMAIL || "HRaniti <digest@hraniti.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [candidate.email],
      subject: `Interview invitation: ${job.title || "your interview"}`,
      html,
      ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof result?.message === "string" ? result.message : "The email provider rejected the invitation.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sentTo: candidate.email, emailId: result?.id || null });
}
