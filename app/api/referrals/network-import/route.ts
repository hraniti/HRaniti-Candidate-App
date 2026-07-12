import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Job } from "@/lib/types";
import { matchJobsByRoleText } from "@/lib/referralMatching";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.name.endsWith(".csv")) return NextResponse.json({ error: "Only .csv files are accepted." }, { status: 400 });

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return NextResponse.json({ error: "That file is empty." }, { status: 400 });

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const roleIdx = header.findIndex((h) => h.includes("role") || h.includes("title"));

  const { data: jobsData } = await supabase.from("jobs").select("*");
  const jobs = (jobsData as Job[]) ?? [];

  const contacts = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const name = nameIdx >= 0 ? cols[nameIdx] : "";
    const email = emailIdx >= 0 ? cols[emailIdx] : "";
    const role = roleIdx >= 0 ? cols[roleIdx] : "";
    const matches = role ? matchJobsByRoleText(role, jobs, 3) : [];
    return {
      user_id: user.id,
      name: name || null,
      email: email || null,
      candidate_role: role || null,
      matched_job_ids: matches.map((j) => j.id),
    };
  }).filter((c) => c.email); // an email is the minimum useful signal

  if (contacts.length === 0) {
    return NextResponse.json({ error: "Couldn't find any rows with an email column." }, { status: 400 });
  }

  const { data: inserted, error } = await supabase.from("imported_contacts").insert(contacts).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const activeMatches = (inserted ?? []).filter((c) => c.matched_job_ids.length > 0).length;

  await supabase
    .from("profiles")
    .update({ network_connections_count: (contacts.length) })
    .eq("id", user.id);

  return NextResponse.json({ imported: contacts.length, activeMatches, contacts: inserted });
}
