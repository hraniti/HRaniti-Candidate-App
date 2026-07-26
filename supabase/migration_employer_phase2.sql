-- HRaniti — Employer App Phase 2: Shortlist & Unlock
-- Run in Supabase → SQL Editor, after migration_employer_phase1.sql.
--
-- IMPORTANT SECURITY NOTE: public.profiles RLS only lets a candidate select
-- their OWN row (auth.uid() = id) — an employer's browser gets nothing if it
-- queries profiles directly for other candidates. That's intentional and
-- must stay that way. Everything below is built around that constraint:
-- employers only ever see a masked view, and full contact details are only
-- ever returned by the unlock_candidate() function below, never by a raw
-- table/column select from the client.

-- 1. MASKED CANDIDATE DIRECTORY ----------------------------------------------
-- Deliberately excludes full_name, email, phone, linkedin_url. This view's
-- column list IS the privacy boundary — even if RLS or grants are ever
-- misconfigured, these columns are simply not selectable through it.
create or replace view public.candidate_directory as
select
  p.id,
  'HR-' || upper(substring(p.id::text, 1, 4)) as candidate_code,
  p.career_track,
  p.skills,
  p.years_experience,
  p.current_location,
  p.city,
  p.preferred_locations,
  p.work_preference,
  p.availability_status,
  p.resume_uploaded,
  p.last_resume_upload_at,
  p.integrity_score,
  p.expected_salary,
  p.salary_currency,
  (
    select sp.score from public.saved_pitches sp
    where sp.user_id = p.id and sp.status = 'Shared with Employers'
    order by sp.created_at desc limit 1
  ) as video_pitch_score
from public.profiles p
where p.show_profile_to_recruiters = true
  and p.profile_visibility <> 'Private';

grant select on public.candidate_directory to authenticated;

-- 2. UNLOCK CANDIDATE (the single, unified unlock action) --------------------
-- Only path through which an employer's client ever receives a candidate's
-- real name/email/phone. Idempotent — unlocking twice doesn't charge twice.
-- NOTE: this records a cost against the employer's plan for bookkeeping;
-- it does NOT yet charge real money — Razorpay integration is a later step,
-- flagged separately.
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
  v_employer_id uuid := auth.uid();
  v_plan text;
  v_cost numeric;
begin
  if v_employer_id is null then
    raise exception 'Not authenticated';
  end if;

  select plan into v_plan from public.employers where employers.id = v_employer_id;
  if v_plan is null then
    raise exception 'Employer profile not found';
  end if;

  if exists (
    select 1 from public.candidate_unlocks cu
    where cu.employer_id = v_employer_id and cu.candidate_id = p_candidate_id
  ) then
    return query
      select p.id, p.full_name, p.email, p.phone, p.linkedin_url, p.professional_summary
      from public.profiles p where p.id = p_candidate_id;
    return;
  end if;

  v_cost := case v_plan when 'Free' then 40 else 0 end;

  insert into public.candidate_unlocks (employer_id, candidate_id, job_id, cost, plan_at_unlock)
  values (v_employer_id, p_candidate_id, p_job_id, v_cost, v_plan);

  return query
    select p.id, p.full_name, p.email, p.phone, p.linkedin_url, p.professional_summary
    from public.profiles p where p.id = p_candidate_id;
end;
$$;

grant execute on function public.unlock_candidate(uuid, uuid) to authenticated;
