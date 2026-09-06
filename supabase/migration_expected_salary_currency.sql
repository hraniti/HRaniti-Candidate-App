-- HRaniti — Separate currency for expected salary
-- Run in Supabase SQL Editor. Purely additive.
--
-- Candidates open to international roles may expect salary in a different
-- currency than their current one (e.g. current salary in INR, expected in
-- AED/USD for a UAE/international role). Previously both fields shared a
-- single salary_currency column.

alter table public.profiles
  add column if not exists expected_salary_currency text default 'INR';
