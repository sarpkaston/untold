-- ================================================================
-- UNTOLD — Migration 005: Storage Buckets (Profil Fotoğrafları)
-- Supabase Dashboard → SQL Editor → yapıştır → Run
-- ================================================================

-- avatars bucket oluştur (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Kullanıcılar kendi klasörlerine yükleyebilsin
drop policy if exists "avatars_upload" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_read"   on storage.objects;

create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
