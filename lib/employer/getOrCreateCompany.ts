import { SupabaseClient, User } from "@supabase/supabase-js";

// Ensures the logged-in user has an employer_profiles row linked to a
// companies row, creating both on first login (works for both the email
// signup path and the OAuth callback path). Returns the company_id.
//
// Delegates to the create_employer_account() Postgres function rather than
// doing two separate client-side inserts — see
// supabase/migration_employer_bootstrap_fix.sql for why: reading back a
// freshly-inserted company's id from the client hits an RLS chicken-and-egg
// problem (you can only read a company you're already linked to), so both
// rows need to be created atomically, server-side, in one call.
export async function getOrCreateCompanyId(
  supabase: SupabaseClient,
  user: User
): Promise<string> {
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  const { data, error } = await supabase.rpc("create_employer_account", {
    p_full_name: fullName,
  });

  if (error || !data) {
    throw error ?? new Error("Failed to create or fetch employer account");
  }

  return data as string;
}

