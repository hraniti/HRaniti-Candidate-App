import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data } = await supabase.from("referral_payment_methods").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ methods: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { methodType, upiId, bankAccountNumber, bankIfsc, bankAccountHolderName } = body;

  if (methodType === "upi" && !upiId) return NextResponse.json({ error: "UPI ID is required" }, { status: 400 });
  if (methodType === "bank" && (!bankAccountNumber || !bankIfsc || !bankAccountHolderName)) {
    return NextResponse.json({ error: "All bank details are required" }, { status: 400 });
  }

  // Only one default method at a time — clear prior defaults first.
  await supabase.from("referral_payment_methods").update({ is_default: false }).eq("user_id", user.id);

  const { data: method, error } = await supabase
    .from("referral_payment_methods")
    .insert({
      user_id: user.id,
      method_type: methodType,
      upi_id: methodType === "upi" ? upiId : null,
      bank_account_number: methodType === "bank" ? bankAccountNumber : null,
      bank_ifsc: methodType === "bank" ? bankIfsc : null,
      bank_account_holder_name: methodType === "bank" ? bankAccountHolderName : null,
      is_default: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ method });
}
