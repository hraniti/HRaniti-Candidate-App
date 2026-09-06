-- HRaniti — Last working day for immediate notice period
-- Run in Supabase SQL Editor. Purely additive.
--
-- When a candidate's notice period is "Immediate", we ask for their actual
-- last working day rather than just the category, since "immediate" alone
-- doesn't tell an employer whether that means today or in a few days.

alter table public.profiles
  add column if not exists last_working_day date;
