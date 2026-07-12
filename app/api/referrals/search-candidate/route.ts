import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ results: [] });

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, current_designation, current_company")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .neq("id", user.id)
    .limit(8);

  return NextResponse.json({ results: data ?? [] });
}
