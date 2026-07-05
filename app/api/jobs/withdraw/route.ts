import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { applicationId } = await req.json();
  if (!applicationId) return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });

  const { error } = await supabase
    .from("applications")
    .update({ status: "Withdrawn", withdrawn_at: new Date().toISOString(), next_step: "Withdrawn by candidate" })
    .eq("id", applicationId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
