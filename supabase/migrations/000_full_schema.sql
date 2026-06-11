-- ================================================================
--  UNTOLD — TAM SCHEMA (idempotent, güvenle tekrar çalıştırılabilir)
--
--  NASIL UYGULANIR:
--  1. https://supabase.com/dashboard adresine git
--  2. Projeyi seç  →  Sol menüde "SQL Editor"
--  3. "+ New query" butonuna tıkla
--  4. Bu dosyanın tüm içeriğini yapıştır
--  5. Sağ üstteki "RUN" butonuna bas (ya da Ctrl+Enter)
--  6. "Success. No rows returned" çıkması tamam demektir
-- ================================================================


-- ──────────────────────────────────────────────────────────────────
-- 1. STORIES
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.stories (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  title         text        not null,
  subtitle      text        not null default '',
  content       text        not null,
  category      text        not null,
  is_anonymous  boolean     not null default false,
  author_name   text        not null,
  author_avatar text        not null,
  likes         integer     not null default 0,
  published     boolean     not null default true,
  created_at    timestamptz not null default now()
);

alter table public.stories enable row level security;

-- Politikaları önce sil (tekrar çalıştırmayı güvenli yapar)
drop policy if exists "stories_read"     on public.stories;
drop policy if exists "stories_own_read" on public.stories;
drop policy if exists "stories_insert"   on public.stories;
drop policy if exists "stories_update"   on public.stories;
drop policy if exists "stories_delete"   on public.stories;

-- Herkes yayınlanmış hikayeleri okuyabilir
create policy "stories_read" on public.stories
  for select using (published = true);

-- Kullanıcı kendi hikayelerini görür (yayınlanmamış dahil)
create policy "stories_own_read" on public.stories
  for select using (auth.uid() = user_id);

-- Sadece giriş yapmış kullanıcı kendi hikayesini ekler
create policy "stories_insert" on public.stories
  for insert with check (auth.uid() = user_id);

-- Sadece sahibi güncelleyebilir
create policy "stories_update" on public.stories
  for update using (auth.uid() = user_id);

-- Sadece sahibi silebilir
create policy "stories_delete" on public.stories
  for delete using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────────
-- 2. CATEGORIES
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id         uuid        default gen_random_uuid() primary key,
  name       text        not null unique,
  is_preset  boolean     not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

drop policy if exists "categories_read"   on public.categories;
drop policy if exists "categories_insert" on public.categories;

-- Herkes okuyabilir
create policy "categories_read" on public.categories
  for select using (true);

-- Giriş yapmış kullanıcılar yeni kategori ekleyebilir
create policy "categories_insert" on public.categories
  for insert with check (auth.role() = 'authenticated');


-- Preset kategorileri ekle (varsa atla)
insert into public.categories (name, is_preset) values
  ('Aşk',          true),
  ('Aile',         true),
  ('Kariyer',      true),
  ('Sağlık',       true),
  ('Bağımlılık',   true),
  ('Göç',          true),
  ('Kayıp',        true),
  ('Girişimcilik', true),
  ('Depresyon',    true),
  ('Boşanma',      true),
  ('İflas',        true),
  ('Travma',       true),
  ('Kimlik',       true),
  ('Anı',          true),
  ('Nesiller',     true),
  ('Emek',         true),
  ('Arkadaşlık',   true),
  ('Eğitim',       true),
  ('Din & İnanç',  true),
  ('Yalnızlık',    true),
  ('Hastalık',     true),
  ('Engellilik',   true)
on conflict (name) do nothing;


-- ──────────────────────────────────────────────────────────────────
-- 3. LIVE SESSIONS
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.live_sessions (
  id            uuid        default gen_random_uuid() primary key,
  host_id       uuid        references auth.users(id) on delete cascade not null,
  host_name     text        not null,
  host_avatar   text        not null,
  room_name     text        not null unique,
  title         text        not null,
  viewer_count  integer     not null default 0,
  is_active     boolean     not null default true,
  started_at    timestamptz not null default now()
);

alter table public.live_sessions enable row level security;

drop policy if exists "live_read"   on public.live_sessions;
drop policy if exists "live_insert" on public.live_sessions;
drop policy if exists "live_update" on public.live_sessions;
drop policy if exists "live_delete" on public.live_sessions;

-- Herkes aktif yayınları görebilir
create policy "live_read" on public.live_sessions
  for select using (true);

-- Sadece giriş yapmış kullanıcı kendi yayınını başlatır
create policy "live_insert" on public.live_sessions
  for insert with check (auth.uid() = host_id);

-- Sadece host güncelleyebilir (viewer_count, is_active)
create policy "live_update" on public.live_sessions
  for update using (auth.uid() = host_id);

-- Sadece host silebilir
create policy "live_delete" on public.live_sessions
  for delete using (auth.uid() = host_id);


-- ──────────────────────────────────────────────────────────────────
-- Kontrol: Tabloların oluştuğunu doğrula
-- ──────────────────────────────────────────────────────────────────
select
  table_name,
  (select count(*) from information_schema.columns c
   where c.table_name = t.table_name and c.table_schema = 'public') as kolon_sayisi
from information_schema.tables t
where table_schema = 'public'
  and table_name in ('stories', 'categories', 'live_sessions')
order by table_name;
