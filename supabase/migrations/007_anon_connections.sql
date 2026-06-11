-- ================================================================
--  UNTOLD — Anonim Bağlantı Sistemi
--  profiles tablosuna open_to_anon_connect kolonu ekle
--  anon_connect_requests tablosunu oluştur
--  Güvenle tekrar çalıştırılabilir (idempotent)
-- ================================================================

-- 1. Profiles tablosuna toggle kolonu
alter table public.profiles
  add column if not exists open_to_anon_connect boolean not null default false;

-- 2. Anonim bağlantı istekleri tablosu
create table if not exists public.anon_connect_requests (
  id           uuid        default gen_random_uuid() primary key,
  from_user_id uuid        references auth.users(id) on delete cascade not null,
  to_user_id   uuid        references auth.users(id) on delete cascade not null,
  status       text        not null default 'pending'
               check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now(),
  unique(from_user_id, to_user_id)
);

alter table public.anon_connect_requests enable row level security;

drop policy if exists "acr_insert" on public.anon_connect_requests;
drop policy if exists "acr_select" on public.anon_connect_requests;
drop policy if exists "acr_update" on public.anon_connect_requests;

-- Gönderen kullanıcı kayıt oluşturabilir
create policy "acr_insert" on public.anon_connect_requests
  for insert with check (auth.uid() = from_user_id);

-- Gönderen ve alıcı görebilir
create policy "acr_select" on public.anon_connect_requests
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Sadece alıcı status güncelleyebilir (accept/reject)
create policy "acr_update" on public.anon_connect_requests
  for update using (auth.uid() = to_user_id);

-- Doğrulama
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'anon_connect_requests';
