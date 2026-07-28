-- HRaniti — Realign onto the existing companies / employer_profiles schema
-- Run in Supabase → SQL Editor. This supersedes the `employers` /
-- `employer_members` tables from migration_employer_phase1.sql, which are
-- dropped at the end of this script. Confirmed safe: only 1 test company,
-- 1 test employer_profile, 0 applications exist as of this migration.

-- 1. EXTEND companies WITH THE REMAINING SPEC FIELDS -------------------------
alter table public.companies
  add column if not exists hq_location text,
  add column if not exists logo_url text,
  add column if not exists culture text,
  add column if not exists benefits text,
  add column if not exists tagline text,
  add column if not exists office_photo_urls text[] default '{}',
  add column if not exists intro_video_url text,
  add column if not exists primary_hr_contact_name text,
  add column if not exists recruiter_name text,
  add column if not exists business_email text,
  add column if not exists business_phone text,
  add column if not exists business_registration_number text,
  add column if not exists gst_vat_number text,
  add column if not exists linkedin_company_url text,
  add column if not exists domain_verified boolean default false,
  add column if not exists verification_tier text default 'none',
  add column if not exists perks text[] default '{}',
  add column if not exists certifications text[] default '{}',
  add column if not exists plan text default 'Free',
  add column if not exists onboarding_step text default 'company',
  add column if not exists onboarding_completed boolean default false;

-- 2. EXTEND employer_profiles WITH CONTACT FIELDS FOR THE LOGGED-IN PERSON ---
alter table public.employer_profiles
  add column if not exists business_email text,
  add column if not exists phone text;

-- 3. POINT jobs AT companies, NOT THE DEPRECATED `employers` TABLE -----------
alter table public.jobs
  add column if not exists company_id uuid references public.companies (id) on delete set null,
  add column if not exists posted_by uuid references public.employer_profiles (id) on delete set null;

drop policy if exists "Employers manage their own job postings" on public.jobs;
alter table public.jobs drop column if exists employer_id;

create policy "Employers manage jobs at their own company"
  on public.jobs for all
  using (company_id in (select company_id from public.employer_profiles where id = auth.uid()))
  with check (company_id in (select company_id from public.employer_profiles where id = auth.uid()));

-- 4. REPOINT candidate_unlocks TO companies -----------------------------------
-- Unlocking is a company-wide entitlement: any teammate should see a
-- candidate as already unlocked, not just whoever paid for it.
alter table public.candidate_unlocks
  add column if not exists company_id uuid references public.companies (id) on delete cascade;

alter table public.candidate_unlocks drop constraint if exists candidate_unlocks_employer_id_candidate_id_key;
alter table public.candidate_unlocks drop column if exists employer_id;
alter table public.candidate_unlocks add constraint candidate_unlocks_company_candidate_key unique (company_id, candidate_id);

drop policy if exists "Employers view their own unlocks" on public.candidate_unlocks;
drop policy if exists "Employers create their own unlocks" on public.candidate_unlocks;
create policy "Employers view unlocks at their company"
  on public.candidate_unlocks for select
  using (company_id in (select company_id from public.employer_profiles where id = auth.uid()));
create policy "Employers create unlocks at their company"
  on public.candidate_unlocks for insert
  with check (company_id in (select company_id from public.employer_profiles where id = auth.uid()));

-- 5. REWRITE unlock_candidate() TO USE THE REAL SCHEMA ------------------------
create or replace function public.unlock_candidate(p_candidate_id uuid, p_job_id uuid default null)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  linkedin_url text,
  professional_summary text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_plan text;
  v_cost numeric;
begin
  select company_id into v_company_id from public.employer_profiles where id = auth.uid();
  if v_company_id is null then
    raise exception 'Employer profile not found';
  end if;

  select plan into v_plan from public.companies where id = v_company_id;
  v_plan := coalesce(v_plan, 'Free');

  if exists (
    select 1 from public.candidate_unlocks
    where company_id = v_company_id and candidate_id = p_candidate_id
  ) then
    return query
      select p.id, p.full_name, p.email, p.phone, p.linkedin_url, p.professional_summary
      from public.profiles p where p.id = p_candidate_id;
    return;
  end if;

  v_cost := case v_plan when 'Free' then 40 else 0 end;

  insert into public.candidate_unlocks (company_id, candidate_id, job_id, cost, plan_at_unlock)
  values (v_company_id, p_candidate_id, p_job_id, v_cost, v_plan);

  return query
    select p.id, p.full_name, p.email, p.phone, p.linkedin_url, p.professional_summary
    from public.profiles p where p.id = p_candidate_id;
end;
$$;

grant execute on function public.unlock_candidate(uuid, uuid) to authenticated;

-- 6. DROP THE DUPLICATE, INCORRECT SINGLE-ACCOUNT-PER-COMPANY TABLES ---------
drop table if exists public.employer_members cascade;
drop table if exists public.employers cascade;
