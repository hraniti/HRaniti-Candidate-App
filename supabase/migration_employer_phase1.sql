-- HRaniti — Employer App Phase 1
-- Run this in Supabase → SQL Editor → New query → paste all → Run.
-- Safe to run after supabase/schema.sql and all migration_phase*.sql files.

-- 1. EMPLOYERS ---------------------------------------------------------------
-- One row per employer account, keyed to the same auth.users id Supabase
-- already manages (same auth system as candidates — just a different table).
create table if not exists public.employers (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Section 1: Company Information
  company_name text,
  company_logo_url text,
  website text,
  industry text,
  company_size text,
  hq_location text,
  hiring_locations text[] default '{}',
  description text,

  -- Section 2: Employer Branding (optional)
  culture text,
  benefits text,
  tagline text,
  office_photo_urls text[] default '{}',
  intro_video_url text,

  -- Section 3: Contact Information
  hr_contact_name text,
  recruiter_name text,
  business_email text,
  phone text,

  -- Section 4: Company Verification
  business_registration_number text,
  gst_vat_number text,
  linkedin_company_url text,
  domain_verified boolean default false,
  verification_tier text default 'none', -- 'none' | 'auto' | 'dns' | 'manual'

  -- Section 5 & 6: Perks / Awards (chip selections)
  perks text[] default '{}',
  certifications text[] default '{}',

  -- Plan / subscription
  plan text default 'Free', -- 'Free' | 'Growth' | 'Enterprise'

  -- Progress
  onboarding_step text default 'company', -- tracks where they left off
  onboarding_completed boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.employers enable row level security;

create policy "Employers can view their own company profile"
  on public.employers for select using (auth.uid() = id);
create policy "Employers can update their own company profile"
  on public.employers for update using (auth.uid() = id);
create policy "Employers can insert their own company profile"
  on public.employers for insert with check (auth.uid() = id);

drop trigger if exists set_employers_updated_at on public.employers;
create trigger set_employers_updated_at
  before update on public.employers
  for each row execute procedure public.set_updated_at(); -- reuses function from schema.sql

-- 2. EMPLOYER TEAM MEMBERS (seats) -------------------------------------------
create table if not exists public.employer_members (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  invited_email text not null,
  role text default 'Recruiter', -- 'Owner' | 'Hiring Manager' | 'Tech Lead' | 'HR' | 'Recruiter'
  status text default 'invited', -- 'invited' | 'active'
  created_at timestamptz default now()
);

alter table public.employer_members enable row level security;

create policy "Employers manage their own team members"
  on public.employer_members for all
  using (employer_id in (select id from public.employers where id = auth.uid()))
  with check (employer_id in (select id from public.employers where id = auth.uid()));

-- Every employer becomes their own first "Owner" seat automatically.
create or replace function public.handle_new_employer()
returns trigger as $$
begin
  insert into public.employer_members (employer_id, user_id, invited_email, role, status)
  values (new.id, new.id, new.business_email, 'Owner', 'active')
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_employer_created on public.employers;
create trigger on_employer_created
  after insert on public.employers
  for each row execute procedure public.handle_new_employer();

-- 3. EXTEND JOBS TABLE FOR EMPLOYER AUTHORSHIP --------------------------------
-- The candidate app already reads/matches against public.jobs, and earlier
-- migrations (phase3/3b) already added description, employment_type, salary
-- fields, nice_to_have_skills, and min_experience_years (an int, used by the
-- candidate-side junior/mid/senior filter). We only add what's genuinely
-- new here, and reuse min_experience_years rather than introducing a
-- separate "experience_bracket" text column that candidate-side code
-- wouldn't know about.
alter table public.jobs
  add column if not exists employer_id uuid references public.employers (id) on delete set null,
  add column if not exists target_start_date date,
  add column if not exists why_join_us text,
  add column if not exists status text default 'draft', -- 'draft' | 'active' | 'closed'
  add column if not exists public_slug text unique,
  add column if not exists views int default 0,
  add column if not exists unique_clicks int default 0;

create policy "Employers manage their own job postings"
  on public.jobs for all
  using (employer_id = auth.uid())
  with check (employer_id = auth.uid());

-- 4. CANDIDATE UNLOCKS --------------------------------------------------------
-- One row per (employer, candidate) unlock — the single unified "Unlock
-- Candidate" action from the spec. A candidate is only ever charged for once.
create table if not exists public.candidate_unlocks (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers (id) on delete cascade,
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  cost numeric default 0,
  plan_at_unlock text,
  unlocked_at timestamptz default now(),
  unique (employer_id, candidate_id)
);

alter table public.candidate_unlocks enable row level security;

create policy "Employers view their own unlocks"
  on public.candidate_unlocks for select using (employer_id = auth.uid());
create policy "Employers create their own unlocks"
  on public.candidate_unlocks for insert with check (employer_id = auth.uid());

-- 5. INTEGRITY SCORE (event-based, not time-decaying) ------------------------
alter table public.profiles
  add column if not exists integrity_score numeric default 100;

create table if not exists public.integrity_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null, -- e.g. 'no_show', 'duplicate_flag', 'unresponsive'
  points_delta numeric not null,
  note text,
  created_at timestamptz default now()
);

alter table public.integrity_events enable row level security;
-- No public policy: only readable/writable via server-side (service role)
-- moderation tooling, not directly by candidates or employers.

-- Done. Next: employer signup + onboarding pages read/write public.employers.
