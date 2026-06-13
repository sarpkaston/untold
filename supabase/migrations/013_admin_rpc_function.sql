-- ─────────────────────────────────────────────────────────────────
-- 013_admin_rpc_function.sql
-- RLS sorununu atlamak için SECURITY DEFINER admin fonksiyonu
-- ─────────────────────────────────────────────────────────────────

-- story_reports üzerindeki TÜM mevcut politikaları temizle
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE tablename = 'story_reports' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON story_reports';
  END LOOP;
END $$;

-- Sadece kendi şikayetlerini görebilir / silebilir (normal kullanıcı)
CREATE POLICY "reports_own_insert" ON story_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports_own_select" ON story_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Admin fonksiyonu — SECURITY DEFINER, RLS'yi atlar
CREATE OR REPLACE FUNCTION get_admin_reports()
RETURNS TABLE(id uuid, reason text, created_at timestamptz, story_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT sr.id, sr.reason, sr.created_at, sr.story_id, sr.user_id
    FROM story_reports sr
    ORDER BY sr.created_at DESC
    LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_reports() TO authenticated;
