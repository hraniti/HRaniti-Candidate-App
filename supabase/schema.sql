-- HRaniti candidate app — run this once in Supabase SQL Editor
-- (Project → SQL Editor → New query → paste all of this → Run)

-- 1. PROFILES ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  phone text,
  linkedin_url text,
  professional_summary text,
  career_track text,
  education jsonb default '[]',
  experience jsonb default '[]',
  skills jsonb default '[]',
  certifications jsonb default '[]',
  ai_confidence jsonb,

  current_company text,
  current_designation text,
  years_experience text,
  current_location text,

  resume_uploaded boolean default false,
  preferences_completed boolean default false,
  preferred_role text,
  preferred_locations text[] default '{}',
  open_to_international text[] default '{}',
  work_preference text[] default '{}',
  current_salary numeric,
  expected_salary numeric,
  salary_currency text default 'INR',
  notice_period text,

  availability_status text,
  visa_required boolean,
  visa_status text,

  show_profile_to_recruiters boolean default true,
  allow_resume_download boolean default true,
  show_assessments boolean default true,
  allow_direct_contact boolean default true,
  receive_match_alerts boolean default true,

  checklist jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Individuals can view their own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Individuals can update their own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Individuals can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Recruiters (future employer app) will need a separate, narrower policy
-- that only exposes rows where show_profile_to_recruiters = true — added
-- when the employer side is built, not needed for this candidate MVP.

-- Auto-create a profile row the moment someone signs up (email or OAuth).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- 2. JOBS (minimal, for dashboard matching in this MVP) ---------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null,
  career_track text not null,
  skills text[] default '{}',
  applicant_count int default 0,
  created_at timestamptz default now()
);

alter table public.jobs enable row level security;
create policy "Anyone signed in can read jobs"
  on public.jobs for select using (auth.role() = 'authenticated');

-- A handful of seed rows so the dashboard isn't empty on day one.
-- Delete or replace these once real job postings exist.
insert into public.jobs (title, company, location, career_track, skills, applicant_count)
values
  ('SAP FICO Consultant', 'Innoventra', 'Bengaluru, India', 'ERP', array['SAP','FICO','SQL'], 41),
  ('Data Analyst', 'Northbridge Analytics', 'Remote, India', 'Data & Analytics', array['Python','SQL','Power BI'], 78),
  ('ML Engineer', 'Voxel Labs', 'Hyderabad, India', 'AI / ML', array['Python','PyTorch','MLOps'], 63),
  ('DevOps Engineer', 'CloudPeak', 'Pune, India', 'Cloud / DevOps', array['AWS','Kubernetes','Terraform'], 29),
  ('Embedded Systems Engineer', 'SiliconEdge', 'Bengaluru, India', 'Semiconductor & Embedded', array['C','RTOS','VLSI'], 17),
  ('Clinical Data Associate', 'PharmaNext', 'Mumbai, India', 'Life Sciences & Pharma', array['Clinical Trials','GCP'], 12),
  ('Workday HCM Consultant', 'Innoventra', 'Remote, India', 'ERP', array['Workday','HCM'], 24),
  ('Business Intelligence Analyst', 'Northbridge Analytics', 'Bengaluru, India', 'Data & Analytics', array['SQL','Tableau','Snowflake'], 55)
on conflict do nothing;
