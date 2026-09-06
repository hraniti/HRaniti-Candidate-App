-- HRaniti — Job type preference (Full-time / Contract / Freelance)
-- Run in Supabase SQL Editor. Purely additive.

alter table public.profiles
  add column if not exists job_type_preference text[] default '{}';
