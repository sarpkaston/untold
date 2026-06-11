-- ================================================================
--  UNTOLD — PLANLAMA ÖZELLİKLERİ
--  Canlı yayın ve hikaye planlama için sütun eklemeleri
-- ================================================================

-- live_sessions: açıklama ve zamanlama
alter table public.live_sessions
  add column if not exists description text not null default '',
  add column if not exists scheduled_at timestamptz;

-- stories: zamanlama
alter table public.stories
  add column if not exists scheduled_at timestamptz;

-- Zamanı gelmiş hikayeleri otomatik yayınla (herhangi bir kullanıcı tetikleyebilir)
create or replace function public.auto_publish_scheduled_stories()
returns void language sql security definer as $$
  update public.stories
  set published = true,
      scheduled_at = null
  where published = false
    and scheduled_at is not null
    and scheduled_at <= now();
$$;

-- Zamanı gelen planlanmış canlı yayın sayısını döndür (bildirim için)
create or replace function public.due_live_sessions()
returns setof public.live_sessions language sql security definer as $$
  select * from public.live_sessions
  where is_active = false
    and scheduled_at is not null
    and scheduled_at <= now() + interval '15 minutes'
  order by scheduled_at asc;
$$;

-- Doğrulama
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('live_sessions', 'stories')
  and column_name in ('scheduled_at', 'description')
order by table_name, column_name;
