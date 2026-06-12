-- ─────────────────────────────────────────────────────────────────
-- 010_reports_blocked.sql
-- Şikayet tablosu, gizlenen hikayeler/kullanıcılar, admin yetkileri
-- ─────────────────────────────────────────────────────────────────

-- ── Şikayet tablosu ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS story_reports (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id   uuid        NOT NULL REFERENCES stories(id)   ON DELETE CASCADE,
  reason     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

ALTER TABLE story_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_own"
  ON story_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports_select_own_or_admin"
  ON story_reports FOR SELECT
  USING (
    auth.uid() = user_id
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sarpkaston10@gmail.com'
  );

CREATE POLICY "reports_delete_own_or_admin"
  ON story_reports FOR DELETE
  USING (
    auth.uid() = user_id
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sarpkaston10@gmail.com'
  );

-- ── Gizlenen hikayeler ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_stories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id    uuid        NOT NULL REFERENCES stories(id)   ON DELETE CASCADE,
  story_title text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id)
);

ALTER TABLE blocked_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_stories_all_own"
  ON blocked_stories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Gizlenen kullanıcılar ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id   uuid        NOT NULL,
  blocked_user_name text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_users_all_own"
  ON blocked_users FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Admin: profiles tablosuna is_banned kolonu ───────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Admin: tüm profilleri okuyabilsin
CREATE POLICY "profiles_select_own_or_admin"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sarpkaston10@gmail.com'
  );

-- Admin: herhangi bir profili güncelleyebilsin (ban)
CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sarpkaston10@gmail.com'
  );

-- Admin: herhangi bir hikayeyi silebilsin
CREATE POLICY "stories_delete_own_or_admin"
  ON stories FOR DELETE
  USING (
    auth.uid() = user_id
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'sarpkaston10@gmail.com'
  );
