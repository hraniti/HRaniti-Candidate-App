-- HRaniti Phase 5 — Referral Rewards
-- Run in Supabase SQL Editor. Purely additive.

-- 1. JOB REWARD TIERS ------------------------------------------------------------
-- Locked at the moment the job is posted, per spec — not recalculated later.
alter table public.jobs
  add column if not exists reward_tier text,        -- Entry / Mid / Senior / Leadership
  add column if not exists reward_amount_inr int;

update public.jobs set
  reward_tier = case
    when min_experience_years <= 4 then 'Entry'
    when min_experience_years <= 8 then 'Mid'
    when min_experience_years <= 12 then 'Senior'
    else 'Leadership'
  end,
  reward_amount_inr = case
    when min_experience_years <= 4 then 4000
    when min_experience_years <= 8 then 6500
    when min_experience_years <= 12 then 8500
    else 10000
  end
where reward_tier is null;

-- 2. REFERRALS --------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references public.jobs(id) on delete set null, -- null = general referral, not yet tied to a role
  candidate_email text not null,
  candidate_name text,
  candidate_phone text,
  candidate_linkedin text,
  candidate_current_role text,
  referral_type text default 'role_specific', -- general | role_specific | network_import | resume_upload | existing_candidate
  slug text unique not null, -- the /r/{referrer_slug}/{slug} token for this specific referral instance
  status text default 'Shared', -- Shared/Registered/Applied/Interviewing/Offer/Joined/Payment Processing/Paid/Rejected/Disputed
  candidate_user_id uuid references auth.users(id) on delete set null, -- filled once candidate registers and email matches
  application_id uuid references public.applications(id) on delete set null,
  reward_tier text,
  reward_amount_inr int,
  recommendation_note text, -- max 300 chars, enforced in app layer
  agreement_accepted_at timestamptz,
  joined_date date,
  expected_payment_date date,
  paid_at timestamptz,
  dispute_reason text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '60 days'),
  updated_at timestamptz default now()
);
alter table public.referrals enable row level security;
create policy "Referrers manage their own referrals"
  on public.referrals for all using (auth.uid() = referrer_id) with check (auth.uid() = referrer_id);

create or replace function public.set_referrals_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
drop trigger if exists set_referrals_updated_at on public.referrals;
create trigger set_referrals_updated_at before update on public.referrals
  for each row execute procedure public.set_referrals_updated_at();

create index if not exists referrals_slug_idx on public.referrals (slug);
create index if not exists referrals_candidate_email_idx on public.referrals (lower(candidate_email));

-- 3. NETWORK IMPORT (CSV) ---------------------------------------------------------
create table if not exists public.imported_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  email text,
  candidate_role text,
  matched_job_ids uuid[] default '{}',
  created_at timestamptz default now()
);
alter table public.imported_contacts enable row level security;
create policy "Users manage their own imported contacts"
  on public.imported_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. PAYMENT METHODS ---------------------------------------------------------------
-- Note: storing raw bank/UPI details directly is a pragmatic MVP shortcut, not a
-- production-grade fintech pattern — a real launch should tokenize this via the
-- payment processor rather than holding account numbers in your own database.
create table if not exists public.referral_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  method_type text not null, -- upi | bank
  upi_id text,
  bank_account_number text,
  bank_ifsc text,
  bank_account_holder_name text,
  is_default boolean default true,
  created_at timestamptz default now()
);
alter table public.referral_payment_methods enable row level security;
create policy "Users manage their own payment methods"
  on public.referral_payment_methods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. PAYMENTS (Payment History) -----------------------------------------------------
create table if not exists public.referral_payments (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid references public.referrals(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount_inr int not null,
  currency text default 'INR',
  base_amount_inr int, -- currency-amount separation per spec, even though MVP is INR-only
  method_type text,
  transaction_id text,
  status text default 'pending', -- pending | processing | paid | failed
  paid_at timestamptz,
  receipt_url text,
  created_at timestamptz default now()
);
alter table public.referral_payments enable row level security;
create policy "Users view their own payments"
  on public.referral_payments for select using (auth.uid() = user_id);
-- Intentionally no insert/update policy for regular users — payments are only
-- ever written by the admin flow (service role), never by the referrer directly.

-- 6. KYC ----------------------------------------------------------------------------
create table if not exists public.referral_kyc (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  status text default 'not_required', -- not_required | pending | verified | rejected
  id_document_url text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  admin_notes text
);
alter table public.referral_kyc enable row level security;
create policy "Users manage their own KYC record"
  on public.referral_kyc for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('kyc-documents', 'kyc-documents', false)
  on conflict (id) do nothing;
create policy "Users manage their own KYC documents"
  on storage.objects for all
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. PROFILE ADDITIONS ---------------------------------------------------------------
alter table public.profiles
  add column if not exists network_connections_count int default 0,
  add column if not exists lifetime_referral_earnings int default 0,
  add column if not exists pending_referral_earnings int default 0,
  add column if not exists referral_agreement_accepted_at timestamptz,
  add column if not exists leaderboard_opt_in boolean default false;

-- 8. ACHIEVEMENT BADGES ---------------------------------------------------------------
create table if not exists public.referral_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  badge text not null, -- first_referral | first_hire | 50k_club | 1l_club | top_referrer
  earned_at timestamptz default now(),
  unique (user_id, badge)
);
alter table public.referral_badges enable row level security;
create policy "Users view their own badges"
  on public.referral_badges for select using (auth.uid() = user_id);
