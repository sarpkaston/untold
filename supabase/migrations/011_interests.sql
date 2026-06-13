-- ─────────────────────────────────────────────────────────────────
-- 011_interests.sql
-- Kullanıcı ilgi alanları: profiles tablosuna interests kolonu
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';
