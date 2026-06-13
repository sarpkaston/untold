-- ─────────────────────────────────────────────────────────────────
-- 014_anon_messaging.sql
-- Anonim mesajlaşma: sender_anonymous kolonu + thread_reveals tablosu
-- ─────────────────────────────────────────────────────────────────

-- Gönderici anonim mi? (her mesajda saklanır)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_anonymous boolean DEFAULT false;

-- Kimlik açma tablosu: user_id → partner_id kimliğini açtı
CREATE TABLE IF NOT EXISTS thread_reveals (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  revealed_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, partner_id)
);

ALTER TABLE thread_reveals ENABLE ROW LEVEL SECURITY;

-- Sadece kendi kimliğini açabilirsin
CREATE POLICY "reveals_insert_own" ON thread_reveals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- İki taraf da kendi ve karşı tarafın kayıtlarını okuyabilir
CREATE POLICY "reveals_select_participants" ON thread_reveals FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);
