-- HRaniti — Restore real video_pitch_score in the employer candidate_directory view
-- Run AFTER migration_phase4.sql (which creates saved_pitches).
--
-- This undoes the temporary `null::int as video_pitch_score` workaround from
-- migration_employer_phase2.sql, which was necessary because saved_pitches
-- didn't exist live yet. Now it does, so employers see real scores for
-- candidates who've actually recorded and shared a video pitch — and an
-- honest "not scored" for everyone else, rather than a query error.

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

notify pgrst, 'reload schema';
