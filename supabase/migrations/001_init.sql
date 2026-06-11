-- ================================================================
-- UNTOLD — Supabase Database Migration 001
-- Supabase Dashboard → SQL Editor → New Query → Yapıştır → Run
-- ================================================================

-- STORIES
create table if not exists public.stories (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  title         text not null,
  subtitle      text default '' not null,
  content       text not null,
  category      text not null,
  is_anonymous  boolean default false not null,
  author_name   text not null,
  author_avatar text not null,
  likes         integer default 0 not null,
  published     boolean default true not null,
  created_at    timestamptz default now() not null
);

alter table public.stories enable row level security;

create policy "stories_read"   on public.stories for select using (published = true);
create policy "stories_insert" on public.stories for insert with check (auth.uid() = user_id);
create policy "stories_update" on public.stories for update using (auth.uid() = user_id);
create policy "stories_delete" on public.stories for delete using (auth.uid() = user_id);

-- Kullanıcının kendi hikayelerini görmesi (yayınlanmamış dahil)
create policy "stories_own_read" on public.stories
  for select using (auth.uid() = user_id);

-- CATEGORIES
create table if not exists public.categories (
  id         uuid default gen_random_uuid() primary key,
  name       text not null unique,
  is_preset  boolean default false not null,
  created_at timestamptz default now() not null
);

alter table public.categories enable row level security;

create policy "categories_read"   on public.categories for select using (true);
create policy "categories_insert" on public.categories for insert with check (auth.role() = 'authenticated');

-- Preset kategoriler
insert into public.categories (name, is_preset) values
  ('Aşk', true), ('Aile', true), ('Kariyer', true), ('Sağlık', true),
  ('Bağımlılık', true), ('Göç', true), ('Kayıp', true), ('Girişimcilik', true),
  ('Depresyon', true), ('Boşanma', true), ('İflas', true), ('Travma', true),
  ('Kimlik', true), ('Anı', true), ('Nesiller', true), ('Emek', true),
  ('Arkadaşlık', true), ('Eğitim', true), ('Din & İnanç', true),
  ('Yalnızlık', true), ('Hastalık', true), ('Engellilik', true)
on conflict (name) do nothing;
