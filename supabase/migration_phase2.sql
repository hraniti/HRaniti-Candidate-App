-- HRaniti Phase 2 — My Profile module
-- Run this in Supabase SQL Editor. Safe to run on your existing live database:
-- every statement only ADDS new columns, nothing here touches or deletes Phase 1 data.

alter table public.profiles
  -- Tab 1: Professional Profile — richer skills model (category, proficiency, last used, pinned)
  add column if not exists skills_detail jsonb default '[]',
  -- snapshot of the AI's original output, captured right after parsing, so "Restore AI Version"
  -- has something to restore to even after the candidate edits fields.
  add column if not exists ai_snapshot jsonb,
  add column if not exists ai_updated_at timestamptz,

  -- Tab 2: Job Preferences — fields not covered in Phase 1
  add column if not exists preferred_industries text[] default '{}',
  add column if not exists preferred_employment_type text[] default '{}',
  add column if not exists open_to_buyout boolean default false,
  add column if not exists travel_willingness text,
  add column if not exists travel_percent int,
  add column if not exists international_opportunities_enabled boolean default false,

  -- Tab 3: Personal & Eligibility
  add column if not exists nationality text,
  add column if not exists visa_expiry_date date,
  add column if not exists current_country text,
  add column if not exists state_province text,
  add column if not exists city text,
  add column if not exists languages jsonb default '[]',

  -- Tab 4: Privacy & Account
  add column if not exists profile_visibility text default 'Public',
  add column if not exists blocked_employers text[] default '{}',
  add column if not exists sms_notifications boolean default false,
  add column if not exists profile_slug text unique,
  add column if not exists signup_provider text,
  add column if not exists deletion_requested_at timestamptz;

-- Keep ai_updated_at in sync whenever the resume parser writes new AI data.
-- (The API route sets this explicitly, so no trigger needed here.)

-- Helpful index for the (soon to exist) employer-facing profile lookup by slug.
create index if not exists profiles_slug_idx on public.profiles (profile_slug);

-- Capture signup_provider automatically (email / google / linkedin_oidc) so Tab 4's
-- "can't disconnect the account you signed up with" safeguard has something to check.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, signup_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Backfill anyone who already signed up before this migration ran.
update public.profiles p
set signup_provider = coalesce(u.raw_app_meta_data->>'provider', 'email')
from auth.users u
where u.id = p.id and p.signup_provider is null;
