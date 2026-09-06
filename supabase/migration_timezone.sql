-- HRaniti — Candidate timezone
-- Run in Supabase SQL Editor. Purely additive.
--
-- Useful for scheduling interviews across UAE/Germany/UK time zones.

alter table public.profiles
  add column if not exists timezone text;
