import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
export const runtime = "nodejs";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server configuration is incomplete.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function getContext(interviewId: string, token: string) {
  if (!interviewId || !token) return { error: "This feedback link is invalid or expired." } as const;
  const db = getAdmin();
  const { data: invite } = await db.from("interview_invitations").select("*").eq("interview_id", interviewId).eq("invite_type", "External").maybeSingle();
  if (!invite || !invite.expires_at || new Date(invite.expires_at).getTime() < Date.now() || hash(token) !== invite.token_hash) return { error: "This feedback link is invalid or expired." } as const;
  const { data: interview } = await db.from("interview_requests").select("id,application_id,scorecard_id,scorecard_criteria").eq("id", interviewId).maybeSingle();
  if (!interview) return { error: "Interview not found." } as const;
  const { data: app } = await db.from("applications").select("job_id").eq("id", interview.application_id).maybeSingle();
  const { data: job } = app ? await db.from("jobs").select("title,company_id").eq("id", app.job_id).maybeSingle() : { data: null };
  const { data: company } = job ? await db.from("companies").select("name").eq("id", job.company_id).maybeSingle() : { data: null };
  const { data: card } = interview.scorecard_id ? await db.from("interview_scorecards").select("criteria").eq("id", interview.scorecard_id).maybeSingle() : { data: null };
  const criteria = Array.isArray(interview.scorecard_criteria) && interview.scorecard_criteria.length ? interview.scorecard_criteria : (Array.isArray(card?.criteria) ? card.criteria : []);
  return { db, invite, interview, job, company, criteria } as const;
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ctx = await getContext(url.searchParams.get("interviewId") || "", url.searchParams.get("token") || "");
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: 401 });
    return NextResponse.json({ companyName: ctx.company?.name || "Hiring team", jobTitle: ctx.job?.title || "Interview", interviewerName: ctx.invite.name, criteria: ctx.criteria, status: ctx.invite.status });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load feedback." }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ctx = await getContext(String(body.interviewId || ""), String(body.token || ""));
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: 401 });
    if (ctx.invite.status !== "Invited") return NextResponse.json({ error: "This feedback invitation has already been submitted." }, { status: 409 });
    if (!["Strong hire", "Hire", "Hold", "No hire"].includes(String(body.recommendation || ""))) return NextResponse.json({ error: "Choose an overall recommendation." }, { status: 400 });
    const ratings = body.ratings && typeof body.ratings === "object" ? body.ratings : {};
    for (const criterion of ctx.criteria) {
      const score = ratings[criterion.name];
      if (!Number.isInteger(score) || score < 1 || score > 5) return NextResponse.json({ error: "Rate every criterion from 1 to 5." }, { status: 400 });
    }
    const { error } = await ctx.db.from("interview_feedback").insert({
      interview_id: ctx.interview.id, company_id: ctx.invite.company_id, interviewer_id: null, ratings,
      overall_recommendation: body.recommendation, strengths: String(body.strengths || "").slice(0, 3000) || null,
      concerns: String(body.concerns || "").slice(0, 3000) || null,
      notes: ("External interviewer (" + String(ctx.invite.name || ctx.invite.email || "Interviewer") + "): " + String(body.notes || "")).slice(0, 3200)
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { error: inviteError } = await ctx.db.from("interview_invitations").update({ status: "Submitted", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", ctx.invite.id);
    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit feedback." }, { status: 500 }); }
}
