-- ================================================================
-- UNTOLD — Migration 004: Messages (Mesajlaşma)
-- Supabase Dashboard → SQL Editor → yapıştır → Run
-- ================================================================

-- ── messages tablosu ─────────────────────────────────────────────
create table if not exists public.messages (
  id            uuid        default gen_random_uuid() primary key,
  from_user_id  uuid        references auth.users(id) on delete cascade not null,
  to_user_id    uuid        references auth.users(id) on delete cascade not null,
  content       text        not null check (char_length(content) >= 1 and char_length(content) <= 500),
  read          boolean     not null default false,
  created_at    timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "msg_select" on public.messages;
drop policy if exists "msg_insert" on public.messages;
drop policy if exists "msg_update" on public.messages;

create policy "msg_select" on public.messages
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "msg_insert" on public.messages
  for insert with check (auth.uid() = from_user_id);

create policy "msg_update" on public.messages
  for update using (auth.uid() = to_user_id);

create index if not exists idx_messages_from on public.messages(from_user_id);
create index if not exists idx_messages_to   on public.messages(to_user_id);
create index if not exists idx_messages_time on public.messages(created_at desc);

-- ── profiles tablosuna avatar_url ekle ───────────────────────────
alter table public.profiles add column if not exists avatar_url text;

-- ── Supabase Realtime için messages tablosunu etkinleştir ────────
-- Tablo zaten ekliyse ya da publication yoksa hata vermeden geçer
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when others then
  null;
end $$;

-- ── Doğrulama ────────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'messages';
