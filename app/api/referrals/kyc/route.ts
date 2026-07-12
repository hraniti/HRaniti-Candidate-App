import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data } = await supabase.from("referral_kyc").select("*").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ kyc: data ?? null });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("document") as File | null;
  if (!file) return NextResponse.json({ error: "No document provided" }, { status: 400 });

  const path = `${user.id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: kyc, error } = await supabase
    .from("referral_kyc")
    .upsert(
      {
        user_id: user.id,
        status: "pending",
        id_document_url: path,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ kyc });
}
