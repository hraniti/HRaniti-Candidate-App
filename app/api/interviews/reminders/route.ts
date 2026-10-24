import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Interview reminders are not configured." }, { status: 503 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const horizon = new Date(now + 26 * 60 * 60 * 1000).toISOString();
  const { data: interviews, error } = await admin.from("interview_requests")
    .select("id,application_id,status,confirmed_time,interview_type,interview_mode,duration_minutes,timezone,meeting_link,reminder_minutes")
    .eq("status", "Confirmed").not("confirmed_time", "is", null)
    .gte("confirmed_time", nowIso).lte("confirmed_time", horizon);
  if (error) return NextResponse.json({ error: "Could not load scheduled interviews." }, { status: 500 });
  let sent = 0;
  let failed = 0;
  for (const interview of interviews || []) {
    const start = new Date(interview.confirmed_time);
    if (!Number.isFinite(start.getTime())) continue;
    const offsets = Array.isArray(interview.reminder_minutes) ? interview.reminder_minutes : [];
    for (const offset of offsets) {
      const dueAt = start.getTime() - Number(offset) * 60000;
      if (!Number.isFinite(Number(offset)) || Number(offset) < 0 || dueAt > now || dueAt <= now - 30 * 60000) continue;
      const { data: existing } = await admin.from("interview_reminder_logs").select("id")
        .eq("interview_id", interview.id).eq("scheduled_start", start.toISOString()).eq("reminder_minutes", Number(offset)).maybeSingle();
      if (existing) continue;
      const { data: application } = await admin.from("applications").select("id,user_id,job_id").eq("id", interview.application_id).maybeSingle();
      if (!application) continue;
      const [{ data: candidate }, { data: job }] = await Promise.all([
        admin.from("profiles").select("full_name,email").eq("id", application.user_id).maybeSingle(),
        admin.from("jobs").select("title").eq("id", application.job_id).maybeSingle(),
      ]);
      if (!candidate?.email) continue;
      const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: interview.timezone || "UTC" }).format(start);
      const safe = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
      const html = `<div style="font-family:Arial,sans-serif;color:#173454"><h2>Upcoming interview reminder</h2><p>Hello ${safe(candidate.full_name || "there")},</p><p>Your interview for <strong>${safe(job?.title || "the role")}</strong> is scheduled for ${safe(when)}.</p>${interview.meeting_link ? '<p><a href="' + safe(interview.meeting_link) + '">Join interview</a></p>' : ""}<p>HRANITI Hiring Team</p></div>`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "HRaniti <digest@hraniti.com>",
          to: [candidate.email], subject: `Reminder: interview for ${job?.title || "the role"}`, html,
          ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { failed++; continue; }
      const { error: logError } = await admin.from("interview_reminder_logs").insert({
        interview_id: interview.id, scheduled_start: start.toISOString(), reminder_minutes: Number(offset),
        recipient_emails: [candidate.email], provider_email_id: result?.id || null,
      });
      if (logError) failed++; else sent++;
    }
  }
  return NextResponse.json({ sent, failed });
}
