-- HRaniti Phase 2c — resume upload throttle
-- Prevents repeated resume uploads from spamming your OpenAI bill.
-- Run this in Supabase SQL Editor.

alter table public.profiles
  add column if not exists last_resume_upload_at timestamptz;
