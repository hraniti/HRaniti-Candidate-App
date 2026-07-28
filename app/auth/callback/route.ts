import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCompanyId } from "@/lib/employer/getOrCreateCompany";

// Google/LinkedIn OAuth land here. Per the spec: OAuth users bypass OTP
// entirely. Candidates go straight to Screen 3 (resume upload); employers
// (flagged via ?intent=employer on the OAuth redirectTo) go to company
// onboarding instead, getting a companies + employer_profiles row created
// here since there's no separate signUp() call in the OAuth path.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intent = searchParams.get("intent");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);

    if (intent === "employer") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await getOrCreateCompanyId(supabase, user);
      }

      return NextResponse.redirect(`${origin}/employer/onboarding/company`);
    }
  }

  return NextResponse.redirect(`${origin}/onboarding/resume`);
}
