import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return replacements[character] ?? character;
  });
}

function formatInterviewTime(value: unknown, timezone: string) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date);
  } catch (error) {
    return date.toLocaleString("en-GB");
  }
}

async function sendResendEmail(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
  idempotencyKey: string,
  scheduledAt?: string
) {
  const payload: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
  };

  if (scheduledAt) {
    payload.scheduled_at = scheduledAt;
  }

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const interviewId = String(body.interviewId || "");
    const token = String(body.token || "");
    const response = String(body.response || "");
    const note = String(body.note || "").trim();

    if (!interviewId || !token) {
      return NextResponse.json(
        { error: "This interview link is invalid." },
        { status: 401 }
      );
    }

    const allowedResponses = [
      "Confirmed",
      "Reschedule requested",
      "Declined",
    ];

    if (!allowedResponses.includes(response)) {
      return NextResponse.json(
        { error: "Invalid response." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: invitation } = await admin
      .from("interview_invitations")
      .select("*")
      .eq("interview_id", interviewId)
      .eq("invite_type", "Candidate")
      .maybeSingle();

    if (
      !invitation ||
      new Date(invitation.expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "This interview link is invalid or expired." },
        { status: 401 }
      );
    }

    if (invitation.status !== "Invited") {
      return NextResponse.json(
        { error: "This interview invitation has already been responded to." },
        { status: 409 }
      );
    }

    if (hashToken(token) !== invitation.token_hash) {
      return NextResponse.json(
        { error: "This interview link is invalid or expired." },
        { status: 401 }
      );
    }

    const { data: interview } = await admin
      .from("interview_requests")
      .select("*")
      .eq("id", interviewId)
      .single();

    if (!interview) {
      return NextResponse.json(
        { error: "Interview not found." },
        { status: 404 }
      );
    }

    if (
      ["Completed", "Cancelled", "Declined"].includes(
        String(interview.status)
      )
    ) {
      return NextResponse.json(
        { error: "This interview is no longer awaiting a candidate response." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const nextStatus = response === "Confirmed" ? "Confirmed" : response;

    let nextNotes = interview.notes || "";
    if (note) {
      nextNotes = nextNotes
        ? nextNotes + "\n\nCandidate: " + note
        : "Candidate: " + note;
    }

    const confirmedTime =
      response === "Confirmed"
        ? interview.confirmed_time || interview.proposed_times?.[0] || null
        : interview.confirmed_time;

    const { error: updateError } = await admin
      .from("interview_requests")
      .update({
        status: nextStatus,
        confirmed_time: confirmedTime,
        candidate_response: response,
        candidate_confirmed_at: response === "Confirmed" ? now : null,
        notes: nextNotes,
      })
      .eq("id", interviewId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    // Keep the Applicant pipeline in sync with the candidate's interview response.
    // Interview decisions should remain employer-controlled; we only move the
    // applicant to an interview stage and set the operational next step here.
    if (interview.application_id) {
      const { data: application } = await admin
        .from("applications")
        .select("id,pipeline_stage,next_step")
        .eq("id", interview.application_id)
        .maybeSingle();

      if (application) {
        if (response === "Confirmed") {
          const interviewType = String(interview.interview_type || "").toLowerCase();
          const interviewStage =
            interviewType.includes("recruiter") || interviewType.includes("screen")
              ? "Recruiter Screen"
              : interviewType.includes("hiring manager")
                ? "Hiring Manager Review"
                : interviewType.includes("executive")
                  ? "Executive Review"
                  : interviewType.includes("technical") || interviewType.includes("panel") || interviewType.includes("structured")
                    ? "Technical Interview"
                    : application.pipeline_stage || "Technical Interview";

          await admin
            .from("applications")
            .update({
              confirmed_interview_time: confirmedTime,
              pipeline_stage: interviewStage,
              next_step: "Complete interview and submit feedback",
              updated_at: now,
            })
            .eq("id", application.id);
        } else if (response === "Reschedule requested") {
          await admin
            .from("applications")
            .update({
              next_step: "Arrange a new interview time",
              updated_at: now,
            })
            .eq("id", application.id);
        } else if (response === "Declined") {
          await admin
            .from("applications")
            .update({
              next_step: "Review candidate interview decline",
              updated_at: now,
            })
            .eq("id", application.id);
        }
      }
    }

    const invitationStatus =
      response === "Confirmed"
        ? "Accepted"
        : response === "Declined"
          ? "Declined"
          : "Reschedule requested";

    const { error: invitationError } = await admin
      .from("interview_invitations")
      .update({
        status: invitationStatus,
        submitted_at: now,
        updated_at: now,
      })
      .eq("id", invitation.id);

    if (invitationError) {
      throw new Error(invitationError.message);
    }

    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;

    if (response === "Confirmed" && resendKey && resendFrom) {
      const { data: application } = await admin
        .from("applications")
        .select("user_id,job_id")
        .eq("id", interview.application_id)
        .single();

      const { data: job } = application
        ? await admin
            .from("jobs")
            .select("title,company_id")
            .eq("id", application.job_id)
            .single()
        : { data: null };

      const { data: candidate } = application
        ? await admin
            .from("profiles")
            .select("full_name,email")
            .eq("id", application.user_id)
            .single()
        : { data: null };

      const { data: company } = job
        ? await admin
            .from("companies")
            .select("name")
            .eq("id", job.company_id)
            .single()
        : { data: null };

      const whenValue =
        interview.confirmed_time || interview.proposed_times?.[0] || null;

      if (whenValue && candidate?.email) {
        const timezone = String(interview.timezone || "UTC");
        const display = formatInterviewTime(whenValue, timezone);
        const jobTitle = job?.title || "Interview";
        const candidateName = candidate.full_name || "Candidate";
        const companyName = company?.name || "HRaniti";
        const duration = String(interview.duration_minutes || 60);

        const meetingHtml = interview.meeting_link
          ? '<p><a href="' +
            escapeHtml(interview.meeting_link) +
            '">Join ' +
            escapeHtml(interview.meeting_provider || "meeting") +
            "</a></p>"
          : "";

        const html =
          '<div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #e1e8e7;border-radius:18px;padding:36px;font-family:Arial,sans-serif;color:#173454">' +
          '<div style="font-weight:700;font-size:22px">' +
          escapeHtml(companyName) +
          "</div>" +
          "<p>Thank you, " +
          escapeHtml(candidateName) +
          ". Your interview is confirmed.</p>" +
          "<p><strong>" +
          escapeHtml(jobTitle) +
          "</strong><br/>" +
          escapeHtml(display) +
          " · " +
          escapeHtml(timezone) +
          "<br/>" +
          escapeHtml(duration) +
          " minutes</p>" +
          meetingHtml +
          "<p>We look forward to speaking with you.</p>" +
          "</div>";

        await sendResendEmail(
          resendKey,
          resendFrom,
          candidate.email,
          "Interview confirmed — " + jobTitle,
          html,
          "interview-confirmed#" + interviewId + "#" + invitation.id
        );

        const reminderMinutes = Array.isArray(interview.reminder_minutes)
          ? interview.reminder_minutes
          : [];

        const interviewDate = new Date(String(whenValue));

        for (const minutesValue of reminderMinutes) {
          const minutes = Number(minutesValue);
          if (!Number.isFinite(minutes) || minutes <= 0) {
            continue;
          }

          const scheduled = new Date(
            interviewDate.getTime() - minutes * 60 * 1000
          );

          if (
            scheduled.getTime() <= Date.now() ||
            scheduled.getTime() >= Date.now() + 30 * 86400000
          ) {
            continue;
          }

          let label = String(minutes) + " minutes";
          if (minutes >= 1440) {
            label = String(Math.round(minutes / 1440)) + " day";
          } else if (minutes >= 60) {
            label = String(Math.round(minutes / 60)) + " hour";
          }

          const reminderHtml =
            "<p>Hello " +
            escapeHtml(candidateName) +
            ",</p><p>This is a reminder for your interview at " +
            escapeHtml(display) +
            ".</p>" +
            (interview.meeting_link
              ? '<p><a href="' +
                escapeHtml(interview.meeting_link) +
                '">Join meeting</a></p>'
              : "");

          await sendResendEmail(
            resendKey,
            resendFrom,
            candidate.email,
            "Reminder: interview in " + label + " — " + jobTitle,
            reminderHtml,
            "interview-reminder#" + interviewId + "#" + minutes,
            scheduled.toISOString()
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: response,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record response.",
      },
      { status: 500 }
    );
  }
}
