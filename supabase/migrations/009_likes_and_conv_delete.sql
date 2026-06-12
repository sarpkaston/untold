-- ================================================================
--  UNTOLD — Migration 009
--  1. story_likes tablosunu ve sayaç RPC'lerini garantile
--  2. Mesaj silme politikasını güncelle (sohbet silme için)
--  Güvenle tekrar çalıştırılabilir (idempotent)
-- ================================================================

-- ── 1. story_likes tablosu ───────────────────────────────────────
create table if not exists public.story_likes (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  story_id   uuid        references public.stories(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, story_id)
);

alter table public.story_likes enable row level security;

drop policy if exists "sl_read"   on public.story_likes;
drop policy if exists "sl_insert" on public.story_likes;
drop policy if exists "sl_delete" on public.story_likes;

create policy "sl_read"   on public.story_likes for select using (true);
create policy "sl_insert" on public.story_likes for insert with check (auth.uid() = user_id);
create policy "sl_delete" on public.story_likes for delete using (auth.uid() = user_id);

-- ── 2. stories tablosunda likes kolonu ──────────────────────────
alter table public.stories add column if not exists likes integer not null default 0;

-- ── 3. Beğeni sayaç RPC'leri ────────────────────────────────────
create or replace function public.increment_story_likes(p_story_id uuid)
returns void language sql security definer as $$
  update public.stories set likes = likes + 1 where id = p_story_id;
$$;

create or replace function public.decrement_story_likes(p_story_id uuid)
returns void language sql security definer as $$
  update public.stories set likes = greatest(0, likes - 1) where id = p_story_id;
$$;

-- ── 4. Mesaj silme politikası: sohbet silme için hem gönderen
--       hem alıcı silebilsin ──────────────────────────────────────
drop policy if exists "msg_delete" on public.messages;

create policy "msg_delete" on public.messages
  for delete using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- ── Doğrulama ────────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('story_likes', 'messages');
