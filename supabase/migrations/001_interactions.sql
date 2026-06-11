-- ================================================================
--  UNTOLD — ETKİLEŞİM TABLOLARI
--  Öneri, eşleşme ve gündem algoritmalarının veri kaynakları
--  Güvenle tekrar çalıştırılabilir (idempotent)
-- ================================================================

-- ── story_likes (beğeniler, zaman damgalı) ───────────────────────
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

-- ── story_saves (rafıma al, zaman damgalı) ───────────────────────
create table if not exists public.story_saves (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  story_id   uuid        references public.stories(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, story_id)
);
alter table public.story_saves enable row level security;
drop policy if exists "ss_read"   on public.story_saves;
drop policy if exists "ss_insert" on public.story_saves;
drop policy if exists "ss_delete" on public.story_saves;
create policy "ss_read"   on public.story_saves for select using (true);
create policy "ss_insert" on public.story_saves for insert with check (auth.uid() = user_id);
create policy "ss_delete" on public.story_saves for delete using (auth.uid() = user_id);

-- ── story_comments (yorumlar) ────────────────────────────────────
create table if not exists public.story_comments (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  story_id    uuid        references public.stories(id) on delete cascade not null,
  author_name text        not null,
  author_avatar text      not null default '',
  content     text        not null,
  created_at  timestamptz not null default now()
);
alter table public.story_comments enable row level security;
drop policy if exists "sc_read"   on public.story_comments;
drop policy if exists "sc_insert" on public.story_comments;
drop policy if exists "sc_delete" on public.story_comments;
create policy "sc_read"   on public.story_comments for select using (true);
create policy "sc_insert" on public.story_comments for insert with check (auth.uid() = user_id);
create policy "sc_delete" on public.story_comments for delete using (auth.uid() = user_id);

-- ── story_views (okuma geçmişi, öneri için) ──────────────────────
create table if not exists public.story_views (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  story_id   uuid        references public.stories(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, story_id)
);
alter table public.story_views enable row level security;
drop policy if exists "sv_own_read" on public.story_views;
drop policy if exists "sv_insert"   on public.story_views;
create policy "sv_own_read" on public.story_views for select using (auth.uid() = user_id);
create policy "sv_insert"   on public.story_views for insert with check (auth.uid() = user_id);

-- ── Beğeni sayacı RPC fonksiyonları ──────────────────────────────
create or replace function public.increment_story_likes(p_story_id uuid)
returns void language sql security definer as $$
  update public.stories set likes = likes + 1 where id = p_story_id;
$$;

create or replace function public.decrement_story_likes(p_story_id uuid)
returns void language sql security definer as $$
  update public.stories set likes = greatest(0, likes - 1) where id = p_story_id;
$$;

-- ── Doğrulama ────────────────────────────────────────────────────
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('story_likes','story_saves','story_comments','story_views')
order by table_name;
