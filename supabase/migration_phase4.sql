-- HRaniti Phase 4 — Interview Hub
-- Run in Supabase SQL Editor. Purely additive.

-- 1. EXTEND assessment_results FOR DOMAIN/BEHAVIOURAL/LANGUAGE DETAIL ------------
alter table public.assessment_results
  add column if not exists tier text, -- CEFR tier (A1-C2) for Language assessments only
  add column if not exists report jsonb, -- structured detail: answers, behavioral profile, per-question breakdown
  add column if not exists language text, -- which language, for Language assessments
  add column if not exists career_track text; -- which track, for Domain assessments

-- 2. MOCK INTERVIEW RESULTS (Paid tier) -------------------------------------------
create table if not exists public.mock_interview_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  interview_types text[] default '{}', -- Technical / Behavioural / Cultural / Communication / Case
  job_description text,
  company_name text,
  language text default 'English',
  difficulty text default 'Intermediate', -- Beginner / Intermediate / Advanced
  status text default 'In Progress', -- In Progress / Completed / Abandoned
  score int,
  duration_seconds int,
  questions jsonb default '[]', -- [{question, type}]
  transcript jsonb default '[]', -- [{question, answer, skipped, video_url}]
  feedback jsonb, -- { overall_score, breakdown: {type: score}, per_question: [...], resources: [...] }
  proctoring_flags jsonb default '{"tab_switches": 0, "copy_paste_events": 0}',
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table public.mock_interview_results enable row level security;
create policy "Users manage their own mock interviews"
  on public.mock_interview_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. QUESTION BANK (shared content, read-only for candidates) ---------------------
create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- Technical / Behavioural / Language / Cultural / Case
  question_text text not null,
  difficulty text not null, -- Beginner / Intermediate / Advanced
  category text not null, -- System Design / STAR Method / Communication / Domain-Specific etc
  model_answer text,
  created_at timestamptz default now()
);
alter table public.question_bank enable row level security;
create policy "Anyone signed in can read the question bank"
  on public.question_bank for select using (auth.role() = 'authenticated');

-- 4. BOOKMARKED QUESTIONS ----------------------------------------------------------
create table if not exists public.bookmarked_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  question_id uuid references public.question_bank(id) on delete cascade not null,
  bookmarked_at timestamptz default now(),
  unique (user_id, question_id)
);
alter table public.bookmarked_questions enable row level security;
create policy "Users manage their own bookmarks"
  on public.bookmarked_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. SAVED PITCHES (Video Pitch) ---------------------------------------------------
create table if not exists public.saved_pitches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  video_url text not null,
  score int,
  ai_feedback jsonb, -- { positives: [], improvements: [], tips: [], score }
  status text default 'Saved', -- Saved / Shared with Employers / Draft
  created_at timestamptz default now()
);
alter table public.saved_pitches enable row level security;
create policy "Users manage their own saved pitches"
  on public.saved_pitches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. PROFILE ADDITIONS --------------------------------------------------------------
-- subscription_tier gates Mock Interview + Question Bank + Video Pitch AI Coaching.
-- No payment processor is wired up yet — this column exists so the paid-tier UI
-- and access checks are ready the moment billing (Stripe/Razorpay) is added.
-- Until then it defaults to 'free' for everyone.
alter table public.profiles
  add column if not exists subscription_tier text default 'free', -- 'free' | 'paid'
  add column if not exists current_video_pitch_url text;

-- Storage buckets for interview audio/video and video pitches.
insert into storage.buckets (id, name, public) values ('interview-media', 'interview-media', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('video-pitches', 'video-pitches', false)
  on conflict (id) do nothing;

create policy "Users manage their own interview media"
  on storage.objects for all
  using (bucket_id = 'interview-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'interview-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users manage their own video pitches"
  on storage.objects for all
  using (bucket_id = 'video-pitches' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'video-pitches' and (storage.foldername(name))[1] = auth.uid()::text);

-- 7. SEED: a starter question bank (expand this over time — this is a realistic
-- MVP seed set, not the full 200+ per type your spec describes long-term).
insert into public.question_bank (type, question_text, difficulty, category, model_answer) values
('Technical', 'Design a recommendation system for 100M+ users.', 'Advanced', 'System Design', 'Discuss data collection, candidate generation, ranking models, and how you would handle cold-start users and scalability.'),
('Technical', 'How would you optimize a slow SQL query on a large table?', 'Intermediate', 'Domain-Specific', 'Check indexes, examine the query plan, avoid SELECT *, consider denormalization or caching for read-heavy workloads.'),
('Technical', 'Explain the difference between REST and GraphQL.', 'Beginner', 'Domain-Specific', 'REST uses fixed endpoints per resource; GraphQL lets clients request exactly the fields they need through a single endpoint.'),
('Technical', 'How would you design a rate limiter for an API?', 'Advanced', 'System Design', 'Consider token bucket or sliding window algorithms, distributed counters (e.g. Redis), and how to fail gracefully under load.'),
('Technical', 'What is the difference between SQL and NoSQL databases, and when would you choose one over the other?', 'Beginner', 'Domain-Specific', 'SQL suits structured, relational data with strong consistency needs; NoSQL suits flexible schemas and horizontal scale.'),
('Behavioural', 'Tell me about a time you handled a conflict at work.', 'Intermediate', 'STAR Method', 'Structure your answer with Situation, Task, Action, Result — focus on what you personally did and the measurable outcome.'),
('Behavioural', 'Describe a situation where you had to meet a tight deadline.', 'Beginner', 'STAR Method', 'Explain how you prioritized tasks, communicated with stakeholders, and what the final outcome was.'),
('Behavioural', 'Tell me about a time you failed and what you learned from it.', 'Intermediate', 'STAR Method', 'Be honest about the failure, focus on ownership and the concrete change in behavior it led to.'),
('Behavioural', 'How do you handle feedback you disagree with?', 'Intermediate', 'Communication', 'Show you can listen without being defensive, ask clarifying questions, and decide thoughtfully rather than reactively.'),
('Behavioural', 'Describe a time you had to lead a team through a difficult project.', 'Advanced', 'STAR Method', 'Highlight how you set direction, unblocked the team, and kept morale and delivery on track.'),
('Language', 'How would you explain a complex technical issue to a non-technical stakeholder?', 'Intermediate', 'Communication', 'Use analogies, avoid jargon, check understanding frequently, and focus on business impact over technical detail.'),
('Language', 'Describe your ideal work environment in detail.', 'Beginner', 'Communication', 'Be specific about collaboration style, pace, and structure — vague answers read as unprepared.'),
('Cultural', 'What does "ownership" mean to you in a work context?', 'Intermediate', 'Communication', 'Discuss proactively identifying problems, following through without being asked, and taking responsibility for outcomes.'),
('Cultural', 'How do you adapt your working style across different cultures or teams?', 'Advanced', 'Communication', 'Give a concrete example of adjusting communication style, pace, or expectations for a specific team or region.'),
('Case', 'A client wants to reduce churn by 20% in 6 months — how would you approach it?', 'Advanced', 'Case', 'Break down churn drivers, propose measurable interventions, and define how you would track success.'),
('Case', 'How would you prioritize features for a product with limited engineering resources?', 'Intermediate', 'Case', 'Use a framework like impact vs effort, tie priorities to business goals, and explain tradeoffs clearly.')
on conflict do nothing;
