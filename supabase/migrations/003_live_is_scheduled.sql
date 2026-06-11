-- live_sessions tablosuna eksik kolonları ekle (idempotent)
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS description   text        default '';
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS scheduled_at  timestamptz;
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS is_scheduled  boolean     not null default false;

-- stories tablosuna scheduled_at (önceki migration'dan kaçırıldıysa)
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- auto_publish fonksiyonu (önceki migration'dan kaçırıldıysa)
create or replace function public.auto_publish_scheduled_stories()
returns void language sql security definer as $$
  update public.stories
  set published = true, scheduled_at = null
  where published = false
    and scheduled_at is not null
    and scheduled_at <= now();
$$;

-- Doğrulama
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('live_sessions', 'stories')
  and column_name in ('scheduled_at', 'description', 'is_scheduled')
order by table_name, column_name;
