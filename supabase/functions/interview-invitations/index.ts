import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const url = Deno.env.get("SUPABASE_URL")!;
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, secret);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
async function getUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const jwt = auth.slice(7);
  const { data } = await admin.auth.getUser(jwt);
  return data.user ?? null;
}
function appUrl() {
  return (Deno.env.get("APP_URL") || "https://hire.hraniti.com").replace(/\/$/, "");
}
async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") || "HRaniti <noreply@hraniti.com>";
  if (!key) return { sent: false, reason: "RESEND_API_KEY is not configured" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) return { sent: false, reason: await response.text() };
  return { sent: true };
}

export default {
  async fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    try {
      const body = await req.json();
      const action = body.action as string;

      if (action === "create_invites") {
        const user = await getUser(req);
        if (!user) return json({ error: "Authentication required" }, 401);
        const interviewId = body.interview_id as string;
        const companyId = body.company_id as string;
        const recipients = Array.isArray(body.recipients) ? body.recipients : [];
        if (!interviewId || !companyId || !recipients.length) return json({ error: "Interview, company and recipients are required" }, 400);

        const { data: member } = await admin.from("company_team_members")
          .select("id,role,status").eq("company_id", companyId).eq("user_id", user.id).eq("status","Active").maybeSingle();
        if (!member || !["Owner","Admin","Recruiter"].includes(member.role)) return json({ error: "You do not have permission to send interview invitations" }, 403);

        const { data: interview } = await admin.from("interview_requests")
          .select("id,company_id,confirmed_time,duration_minutes,interview_type,interview_mode,meeting_link,scorecard_id,scorecard_criteria")
          .eq("id", interviewId).eq("company_id", companyId).single();
        if (!interview) return json({ error: "Interview not found" }, 404);

        const { data: job } = await admin.from("interview_requests").select("application_id").eq("id", interviewId).single();
        let candidateName = "Candidate", jobTitle = "Interview";
        if (job?.application_id) {
          const { data: app } = await admin.from("applications").select("user_id,job_id").eq("id", job.application_id).single();
          if (app) {
            const [{data: profile},{data: jobRow}] = await Promise.all([
              admin.from("profiles").select("full_name").eq("id",app.user_id).maybeSingle(),
              admin.from("jobs").select("title").eq("id",app.job_id).maybeSingle(),
            ]);
            candidateName = profile?.full_name || candidateName;
            jobTitle = jobRow?.title || jobTitle;
          }
        }

        const results = [];
        for (const recipient of recipients) {
          const email = String(recipient.email || "").trim().toLowerCase();
          if (!email) continue;
          const token = randomToken();
          const hash = await sha256(token);
          const { data: invite, error } = await admin.from("interview_invitations").insert({
            interview_id: interviewId, company_id: companyId, interviewer_id: recipient.interviewer_id || null,
            email, name: recipient.name || null, role: recipient.role || null,
            invite_type: recipient.invite_type || "Internal", token_hash: hash,
            last_sent_at: new Date().toISOString(),
          }).select("id").single();
          if (error) return json({ error: error.message }, 400);
          const link = `${appUrl()}/interview/invite?token=${token}`;
          const when = interview.confirmed_time ? new Date(interview.confirmed_time).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}) : "Time to be confirmed";
          const criteria = Array.isArray(interview.scorecard_criteria) ? interview.scorecard_criteria.map((c:any)=>c.name).join(", ") : "Structured interview criteria";
          const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#173454"><p style="color:#167D73;font-size:12px;font-weight:700;letter-spacing:2px">HRANITI · INTERVIEW</p><h1 style="font-size:24px">Interview invitation</h1><p>You have been invited to interview <strong>${candidateName}</strong> for <strong>${jobTitle}</strong>.</p><div style="background:#F6FAF9;border:1px solid #DDE5EA;border-radius:12px;padding:18px"><p><strong>${when}</strong></p><p>${interview.interview_type || "Interview"} · ${interview.duration_minutes || 60} minutes · ${interview.interview_mode || "Online"}</p>${interview.meeting_link ? `<p><a href="${interview.meeting_link}">Join meeting</a></p>` : ""}<p>Scorecard: ${criteria}</p></div><p style="margin-top:24px"><a href="${link}" style="display:inline-block;background:#167D73;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px">Open interview workspace</a></p><p style="font-size:12px;color:#71859A">Your secure workspace is where you review the scorecard and submit feedback. The link expires in 14 days.</p></div>`;
          const emailResult = await sendEmail(email, `Interview invitation — ${jobTitle} | ${candidateName}`, html);
          results.push({ id: invite.id, email, link, emailSent: emailResult.sent, emailReason: emailResult.reason || null });
        }
        return json({ ok: true, invitations: results });
      }

      if (action === "open") {
        const token = String(body.token || "");
        if (!token) return json({ error: "Invitation token required" }, 400);
        const hash = await sha256(token);
        const { data: invite } = await admin.from("interview_invitations").select("id,interview_id,email,name,role,status,expires_at,opened_at,submitted_at").eq("token_hash",hash).maybeSingle();
        if (!invite || new Date(invite.expires_at) < new Date()) return json({ error: "This invitation is invalid or has expired" }, 404);
        if (!invite.opened_at) await admin.from("interview_invitations").update({opened_at:new Date().toISOString(),status:"Opened",updated_at:new Date().toISOString()}).eq("id",invite.id);
        const { data: interview } = await admin.from("interview_requests").select("id,confirmed_time,duration_minutes,timezone,meeting_link,meeting_provider,interview_type,interview_mode,scorecard_criteria,status,notes").eq("id",invite.interview_id).single();
        if (!interview) return json({ error: "Interview not found" }, 404);
        let candidateName="Candidate", jobTitle="Interview";
        const { data: full } = await admin.from("interview_requests").select("application_id").eq("id",invite.interview_id).single();
        if (full?.application_id) {
          const { data: app } = await admin.from("applications").select("user_id,job_id").eq("id",full.application_id).single();
          if (app) {
            const [{data:p},{data:j}] = await Promise.all([admin.from("profiles").select("full_name").eq("id",app.user_id).maybeSingle(),admin.from("jobs").select("title").eq("id",app.job_id).maybeSingle()]);
            candidateName=p?.full_name||candidateName; jobTitle=j?.title||jobTitle;
          }
        }
        return json({ invitation: invite, interview, candidate: {full_name:candidateName}, job:{title:jobTitle} });
      }

      if (action === "submit_feedback") {
        const token = String(body.token || "");
        if (!token) return json({ error: "Invitation token required" }, 400);
        const hash = await sha256(token);
        const { data: invite } = await admin.from("interview_invitations").select("*").eq("token_hash",hash).maybeSingle();
        if (!invite || new Date(invite.expires_at) < new Date()) return json({ error: "This invitation is invalid or has expired" }, 404);
        if (invite.submitted_at) return json({ error: "Feedback has already been submitted" }, 409);
        const ratings = body.ratings && typeof body.ratings === "object" ? body.ratings : {};
        const { error } = await admin.from("interview_feedback").insert({
          interview_id: invite.interview_id, company_id: invite.company_id, interviewer_id: invite.interviewer_id || null,
          ratings, overall_recommendation: body.recommendation || null, strengths: body.strengths || null,
          concerns: body.concerns || null, notes: body.notes || null
        });
        if (error) return json({ error: error.message }, 400);
        await admin.from("interview_invitations").update({submitted_at:new Date().toISOString(),status:"Feedback submitted",updated_at:new Date().toISOString()}).eq("id",invite.id);
        return json({ok:true});
      }

      return json({ error: "Unknown action" }, 400);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
    }
  }
};
