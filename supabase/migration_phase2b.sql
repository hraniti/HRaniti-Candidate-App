-- HRaniti Phase 2b — small additions after initial testing feedback
-- Run this in Supabase SQL Editor, same as before. Purely additive.

alter table public.profiles
  add column if not exists show_video_pitch boolean default true;

-- Storage bucket for certification file uploads (PDF or image), private by default.
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;

-- Candidates can only upload/read/delete files inside their own folder,
-- named as "{user_id}/filename.ext" — enforced by matching the first path segment.
create policy "Users can upload their own certificates"
  on storage.objects for insert
  with check (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view their own certificates"
  on storage.objects for select
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own certificates"
  on storage.objects for delete
  using (bucket_id = 'certificates' and (storage.foldername(name))[1] = auth.uid()::text);
