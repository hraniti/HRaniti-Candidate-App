-- HRaniti Phase 3b — Experience filter support
-- Run in Supabase SQL Editor. Purely additive.

alter table public.jobs
  add column if not exists min_experience_years int default 0;

-- Give the seed jobs some realistic variety so the Experience filter has
-- something meaningful to filter on.
update public.jobs set min_experience_years =
  case
    when title ilike '%lead%' or title ilike '%senior%' or title ilike '%manager%' then 7
    when title ilike '%analyst%' or title ilike '%associate%' then 2
    else 4
  end
where min_experience_years = 0;
