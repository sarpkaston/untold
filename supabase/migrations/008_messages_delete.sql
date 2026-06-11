-- ================================================================
--  UNTOLD — Migration 008: Mesaj silme yetkisi
--  Sadece gönderen kullanıcı kendi mesajını silebilir
--  Güvenle tekrar çalıştırılabilir (idempotent)
-- ================================================================

drop policy if exists "msg_delete" on public.messages;

create policy "msg_delete" on public.messages
  for delete using (auth.uid() = from_user_id);
