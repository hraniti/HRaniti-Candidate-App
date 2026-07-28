-- HRaniti — Fix employer account bootstrap
-- Run in Supabase → SQL Editor.
--
-- Root cause: public.companies' SELECT policy only allows reading a company
-- you're already linked to via employer_profiles. The app's insert-then-
-- .select() pattern needs to read back the newly-created company's id
-- immediately, which RLS blocks since employer_profiles doesn't exist yet
-- at that point — a chicken-and-egg problem. Fixing it with a single
-- security-definer function that creates both rows atomically server-side,
-- sidestepping the timing issue entirely (this is the standard pattern for
-- this kind of "bootstrap my own account" operation).

create or replace function public.create_employer_account(p_full_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Already has a company? Just return it (idempotent — safe to call
  -- on every login, not just the first one).
  select company_id into v_company_id
  from public.employer_profiles
  where id = v_user_id;

  if v_company_id is not null then
    return v_company_id;
  end if;

  insert into public.companies (name) values ('Untitled Company')
  returning id into v_company_id;

  insert into public.employer_profiles (id, company_id, full_name, role)
  values (v_user_id, v_company_id, p_full_name, 'Owner');

  return v_company_id;
end;
$$;

grant execute on function public.create_employer_account(text) to authenticated;
