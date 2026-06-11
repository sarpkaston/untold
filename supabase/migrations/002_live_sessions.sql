-- ================================================================
-- UNTOLD — Migration 002: Live Sessions
-- Supabase Dashboard → SQL Editor → yapıştır → Run
-- ================================================================

create table if not exists public.live_sessions (
  id            uuid default gen_random_uuid() primary key,
  host_id       uuid references auth.users(id) on delete cascade not null,
  host_name     text not null,
  host_avatar   text not null,
  room_name     text not null unique,
  title         text not null,
  viewer_count  integer default 0 not null,
  is_active     boolean default true not null,
  started_at    timestamptz default now() not null
);

alter table public.live_sessions enable row level security;

create policy "live_read"   on public.live_sessions for select using (true);
create policy "live_insert" on public.live_sessions for insert with check (auth.uid() = host_id);
create policy "live_update" on public.live_sessions for update using (auth.uid() = host_id);
create policy "live_delete" on public.live_sessions for delete using (auth.uid() = host_id);
