-- HRaniti — Per-country visa/permit holding
-- Run in Supabase SQL Editor. Purely additive.
--
-- Replaces the old generic "Current visa status" dropdown with a precise
-- signal: which of the candidate's chosen international markets they
-- already hold a valid visa/permit for. Countries in open_to_international
-- but NOT in visa_held_countries implicitly need sponsorship.

alter table public.profiles
  add column if not exists visa_held_countries text[] default '{}';
