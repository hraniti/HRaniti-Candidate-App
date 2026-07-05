import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RecentJobView } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { jobId, jobTitle } = await req.json();
  if (!jobId || !jobTitle) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("recent_job_views").eq("id", user.id).single();
  const existing: RecentJobView[] = profile?.recent_job_views ?? [];

  const next = [
    { id: jobId, title: jobTitle, viewed_at: new Date().toISOString() },
    ...existing.filter((v) => v.id !== jobId),
  ].slice(0, 5);

  await supabase.from("profiles").update({ recent_job_views: next }).eq("id", user.id);

  return NextResponse.json({ success: true });
}
