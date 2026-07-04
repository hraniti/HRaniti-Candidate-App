import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google/LinkedIn OAuth land here. Per the spec: OAuth users bypass OTP
// entirely and go straight to Screen 3 (resume upload).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/onboarding/resume`);
}
