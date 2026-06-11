-- ================================================================
--  UNTOLD — story_comments tablosu düzeltme
--  Tablo yoksa oluşturur, eksik kolonları ekler, RLS ayarlar
--  Güvenle tekrar çalıştırılabilir (idempotent)
-- ================================================================

create table if not exists public.story_comments (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  story_id      uuid        references public.stories(id) on delete cascade not null,
  author_name   text        not null default '',
  author_avatar text        not null default '',
  content       text        not null,
  created_at    timestamptz not null default now()
);

-- Tablo önceden farklı şemada oluşturulmuşsa eksik kolonları ekle
alter table public.story_comments
  add column if not exists author_name   text not null default '';

alter table public.story_comments
  add column if not exists author_avatar text not null default '';

-- RLS
alter table public.story_comments enable row level security;

drop policy if exists "sc_read"   on public.story_comments;
drop policy if exists "sc_insert" on public.story_comments;
drop policy if exists "sc_delete" on public.story_comments;

create policy "sc_read"   on public.story_comments for select using (true);
create policy "sc_insert" on public.story_comments for insert with check (auth.uid() = user_id);
create policy "sc_delete" on public.story_comments for delete using (auth.uid() = user_id);

-- Doğrulama
select count(*) as story_comments_rows from public.story_comments;
