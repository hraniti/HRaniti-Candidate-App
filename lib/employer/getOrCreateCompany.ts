import { SupabaseClient, User } from "@supabase/supabase-js";

// Ensures the logged-in user has an employer_profiles row linked to a
// companies row, creating both on first login (works for both the email
// signup path and the OAuth callback path). Returns the company_id.
export async function getOrCreateCompanyId(
  supabase: SupabaseClient,
  user: User
): Promise<string> {
  const { data: existing } = await supabase
    .from("employer_profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (existing?.company_id) return existing.company_id as string;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name: "Untitled Company" })
    .select("id")
    .single();

  if (companyError || !company) {
    throw companyError ?? new Error("Failed to create company");
  }

  const { error: profileError } = await supabase.from("employer_profiles").insert({
    id: user.id,
    company_id: company.id,
    full_name: fullName,
    role: "Owner",
  });

  if (profileError) throw profileError;

  return company.id as string;
}
