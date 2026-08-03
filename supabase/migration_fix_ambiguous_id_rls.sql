-- HRaniti — Fix "column reference 'id' is ambiguous" in candidate_directory
--
-- Root cause: several RLS policies use a bare `id` in their USING/WITH CHECK
-- expression instead of a table-qualified `tablename.id`. On their own,
-- each policy only touches one table, so the bare reference isn't
-- ambiguous *in isolation*. But my candidate_directory view queries
-- profiles, whose "employer_view_opted_in_candidates" policy runs a
-- subquery against employer_profiles — which has its OWN RLS policy
-- (also using bare `id`) applied automatically the moment it's touched.
-- When Postgres combines/rewrites these nested policy checks together,
-- the bare `id` references collide and Postgres can no longer tell which
-- table's `id` is meant. Fully qualifying every reference removes the
-- ambiguity regardless of how deeply policies get nested.
--
-- Safe to run any number of times — ALTER POLICY just replaces the
-- expression, same effective security rule, just phrased unambiguously.

alter policy "Individuals can view their own profile" on public.profiles
  using (auth.uid() = profiles.id);

alter policy "Individuals can update their own profile" on public.profiles
  using (auth.uid() = profiles.id);

alter policy "Individuals can insert their own profile" on public.profiles
  with check (auth.uid() = profiles.id);

alter policy "Referrers can view profiles of people they referred" on public.profiles
  using (
    profiles.id in (
      select referrals.candidate_user_id from public.referrals
      where referrals.referrer_id = auth.uid()
        and referrals.candidate_user_id is not null
    )
  );

alter policy "employer_view_opted_in_candidates" on public.profiles
  using (
    profiles.show_profile_to_recruiters = true
    and exists (select 1 from public.employer_profiles where employer_profiles.id = auth.uid())
  );

alter policy "employer_own_profile_select" on public.employer_profiles
  using (auth.uid() = employer_profiles.id);

alter policy "employer_own_profile_update" on public.employer_profiles
  using (auth.uid() = employer_profiles.id);

alter policy "employer_own_profile_insert" on public.employer_profiles
  with check (auth.uid() = employer_profiles.id);

-- Same bare-id pattern exists on companies — fixing defensively too, since
-- it's the same risk (companies gets touched via nested policy checks from
-- jobs/candidate_unlocks policies).
alter policy "employer_company_select" on public.companies
  using (
    companies.id in (select employer_profiles.company_id from public.employer_profiles where employer_profiles.id = auth.uid())
  );

alter policy "employer_company_update" on public.companies
  using (
    companies.id in (select employer_profiles.company_id from public.employer_profiles where employer_profiles.id = auth.uid())
  );

notify pgrst, 'reload schema';
