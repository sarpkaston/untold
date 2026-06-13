-- ─────────────────────────────────────────────────────────────────
-- 012_fix_rls_auth_email.sql
-- auth.users yerine auth.email() kullan — "permission denied" düzeltmesi
-- ─────────────────────────────────────────────────────────────────

-- ── story_reports ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "reports_select_own_or_admin"  ON story_reports;
DROP POLICY IF EXISTS "reports_delete_own_or_admin"  ON story_reports;

CREATE POLICY "reports_select_own_or_admin" ON story_reports FOR SELECT
  USING (auth.uid() = user_id OR auth.email() = 'sarpkaston10@gmail.com');

CREATE POLICY "reports_delete_own_or_admin" ON story_reports FOR DELETE
  USING (auth.uid() = user_id OR auth.email() = 'sarpkaston10@gmail.com');

-- ── profiles ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;

CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  USING (auth.uid() = id OR auth.email() = 'sarpkaston10@gmail.com');

CREATE POLICY "profiles_update_own_or_admin" ON profiles FOR UPDATE
  USING (auth.uid() = id OR auth.email() = 'sarpkaston10@gmail.com');

-- ── stories ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stories_delete_own_or_admin" ON stories;

CREATE POLICY "stories_delete_own_or_admin" ON stories FOR DELETE
  USING (auth.uid() = user_id OR auth.email() = 'sarpkaston10@gmail.com');
