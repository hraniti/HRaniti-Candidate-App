-- HRaniti Phase 3 — My Jobs / Career Opportunities
-- Run in Supabase SQL Editor. Purely additive — nothing here touches Phase 1/2 data.

-- 1. ENRICH THE JOBS TABLE ---------------------------------------------------
alter table public.jobs
  add column if not exists description text default '',
  add column if not exists employment_type text default 'Full-time',
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists salary_currency text default 'USD',
  add column if not exists work_mode text default 'On-site',
  add column if not exists visa_sponsorship boolean default false,
  add column if not exists urgent_hiring boolean default false,
  add column if not exists required_skills text[] default '{}',
  add column if not exists preferred_skills text[] default '{}',
  add column if not exists nice_to_have_skills text[] default '{}',
  add column if not exists company_description text default '',
  add column if not exists industry text default '',
  add column if not exists company_size text default '',
  add column if not exists locations text[] default '{}',
  add column if not exists website text default '',
  add column if not exists perks text[] default '{}',
  add column if not exists hiring_team jsonb,
  add column if not exists expected_review_timeline text default '3-5 days',
  add column if not exists referral_slug text unique,
  add column if not exists notice_period_required text;

create index if not exists jobs_referral_slug_idx on public.jobs (referral_slug);

-- 2. SAVED JOBS ---------------------------------------------------------------
-- Kept separate from applications so saved jobs never count against the daily
-- application limit, per spec.
create table if not exists public.saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete cascade not null,
  saved_at timestamptz default now(),
  unique (user_id, job_id)
);
alter table public.saved_jobs enable row level security;
create policy "Users manage their own saved jobs"
  on public.saved_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. APPLICATIONS ---------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete cascade not null,
  status text default 'Applied', -- Applied / Interview Scheduled / Offer / Rejected / Withdrawn / Archived
  applied_at timestamptz default now(),
  application_quality_score int,
  employer_feedback text, -- one of the structured dropdown options, or null
  next_step text default 'Awaiting employer review',
  expected_timeline text,
  ai_match_summary jsonb, -- generated once at submission time, cached
  interview_cheat_sheet jsonb, -- { note: string, generated_at: timestamptz } — generated once when status becomes Interview Scheduled
  withdrawn_at timestamptz,
  updated_at timestamptz default now(),
  unique (user_id, job_id)
);
alter table public.applications enable row level security;
create policy "Users manage their own applications"
  on public.applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.set_applications_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_applications_updated_at on public.applications;
create trigger set_applications_updated_at
  before update on public.applications
  for each row execute procedure public.set_applications_updated_at();

-- 4. CACHED AI INSIGHTS ---------------------------------------------------------
-- One row per (user, job, insight type). Generated on first request, reused
-- after that — this is what keeps "Why This Job" / "Explain Further" cheap.
create table if not exists public.job_match_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete cascade not null,
  insight_type text not null, -- 'why_fit' | 'explain_further' | 'improve_match'
  content jsonb not null,
  generated_at timestamptz default now(),
  unique (user_id, job_id, insight_type)
);
alter table public.job_match_cache enable row level security;
create policy "Users read/write their own match cache"
  on public.job_match_cache for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. ASSESSMENT RESULTS ---------------------------------------------------------
-- Assessment-first qualification: pass once, valid 180 days. Fail = 30-day
-- cooldown for that same assessment type only.
create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  assessment_type text not null, -- 'AI Interview' | 'Domain' | 'Language' | 'Coding Arena'
  score int not null,
  passed boolean not null,
  completed_at timestamptz default now(),
  valid_until timestamptz, -- completed_at + 180 days if passed
  cooldown_until timestamptz -- completed_at + 30 days if failed
);
alter table public.assessment_results enable row level security;
create policy "Users manage their own assessment results"
  on public.assessment_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. PROFILE ADDITIONS ---------------------------------------------------------
alter table public.profiles
  add column if not exists auto_match_enabled boolean default false,
  add column if not exists digest_frequency text default 'Daily', -- Instant / Daily / Weekly / Off
  add column if not exists profile_photo_consent boolean default false,
  add column if not exists recent_job_views jsonb default '[]'; -- last 5: [{id, title, viewed_at}]

-- 7. SEED DATA: enrich existing sample jobs with the new fields -----------------
update public.jobs set
  description = 'We are looking for an experienced professional to join our growing team and help scale our operations across multiple markets.',
  employment_type = 'Full-time',
  salary_min = 1200000, salary_max = 1800000, salary_currency = 'INR',
  work_mode = case when location ilike '%remote%' then 'Remote' else 'Hybrid' end,
  visa_sponsorship = false,
  urgent_hiring = (random() < 0.3),
  required_skills = skills,
  preferred_skills = array[]::text[],
  nice_to_have_skills = array[]::text[],
  company_description = company || ' is a growing company in the ' || career_track || ' space, focused on building reliable, well-run teams.',
  industry = career_track,
  company_size = '201-500 employees',
  locations = array[location],
  website = 'https://example.com',
  perks = array['Health insurance', 'Flexible hours', 'Learning budget'],
  expected_review_timeline = '3-5 days',
  referral_slug = lower(regexp_replace(title || '-' || company, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 6)
where description = '' or description is null;
