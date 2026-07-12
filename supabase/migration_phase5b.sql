-- HRaniti Phase 5b — small addition after building My Referrals
-- Run in Supabase SQL Editor. Purely additive.

-- A referrer needs to see readiness signals (resume uploaded, profile complete,
-- open to work) for candidates they've personally referred — they already have
-- this person's contact details since they're the one who referred them, so
-- this is a narrow, sensible exception to the usual "own row only" rule.
create policy "Referrers can view profiles of people they referred"
  on public.profiles for select
  using (
    id in (select candidate_user_id from public.referrals where referrer_id = auth.uid() and candidate_user_id is not null)
  );
