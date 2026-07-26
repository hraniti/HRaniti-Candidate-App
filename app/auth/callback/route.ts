import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google/LinkedIn OAuth land here. Per the spec: OAuth users bypass OTP
// entirely. Candidates go straight to Screen 3 (resume upload); employers
// (flagged via ?intent=employer on the OAuth redirectTo) go to company
// onboarding instead, and get their `employers` row created here since
// there's no separate signUp() call in the OAuth path to attach it to.
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
        const fullName =
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null;

        await supabase
          .from("employers")
          .upsert(
            {
              id: user.id,
              hr_contact_name: fullName,
              business_email: user.email,
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
      }

      return NextResponse.redirect(`${origin}/employer/onboarding/company`);
    }
  }

  return NextResponse.redirect(`${origin}/onboarding/resume`);
}
