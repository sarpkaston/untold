import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { getInitials } from "../lib/storyUtils";
import styles from "./Settings.module.css";

export default function Settings() {
  const { signOut, user } = useApp();

  const defaultName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const defaultUsername = user?.email?.split("@")[0] || "";

  const [fullName, setFullName] = useState(defaultName);
  const [username, setUsername] = useState(defaultUsername);
  const [bio, setBio] = useState(user?.user_metadata?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Gizlenen içerikler
  const [blockedStories, setBlockedStories] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [hiddenLoaded, setHiddenLoaded] = useState(false);

  useEffect(() => {
    if (!user || hiddenLoaded) return;
    setHiddenLoaded(true);
    Promise.all([
      supabase.from("blocked_stories").select("story_id, story_title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("blocked_users").select("blocked_user_id, blocked_user_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).then(([{ data: bs }, { data: bu }]) => {
      setBlockedStories(bs || []);
      setBlockedUsers(bu || []);
    });
  }, [user]);

  async function unblockStory(storyId) {
    await supabase.from("blocked_stories").delete().eq("user_id", user.id).eq("story_id", storyId);
    setBlockedStories(prev => prev.filter(s => s.story_id !== storyId));
  }

  async function unblockUser(blockedUserId) {
    await supabase.from("blocked_users").delete().eq("user_id", user.id).eq("blocked_user_id", blockedUserId);
    setBlockedUsers(prev => prev.filter(u => u.blocked_user_id !== blockedUserId));
  }

  // Profiles tablosundan yükle
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        if (data.full_name) setFullName(data.full_name);
        if (data.username) setUsername(data.username);
        if (data.bio) setBio(data.bio);
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [user]);

  async function uploadAvatar(e) {
    const file = e.target.files[0];
    if (!file || !user) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { setSaveError("Sadece JPEG, PNG veya WebP yükleyebilirsin."); return; }
    setUploading(true);
    setSaveError("");
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setSaveError("Fotoğraf yüklenemedi: " + upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").upsert(
      { id: user.id, avatar_url: url, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    setAvatarUrl(url);
    setUploading(false);
  }

  async function saveProfile() {
    if (!user || !fullName.trim() || !username.trim()) return;
    setSaving(true);
    setSaveError("");
    setSaved(false);

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) {
      setSaveError(
        error.message.includes("unique") || error.code === "23505"
          ? "Bu kullanıcı adı zaten alınmış."
          : "Kaydedilemedi: " + error.message
      );
      setSaving(false);
      return;
    }

    // Auth metadata'yı da güncelle (Profile.jsx'in okuyabilmesi için)
    await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), bio: bio.trim() },
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const initials = getInitials(fullName || defaultName);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/profil" className={styles.back}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className={styles.title}>Ayarlar</h1>
      </div>

      {/* ── Hesap Ayarları ──────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Hesap Ayarları</p>
        <div className={styles.profileCard}>
          <div className={styles.avatarSection}>
            <label className={styles.avatarUploadLabel} htmlFor="avatarInput">
              {avatarUrl ? (
                <img src={avatarUrl} className={styles.profileAvatarImg} alt="Profil fotoğrafı" />
              ) : (
                <div className={styles.profileAvatar}>{initials}</div>
              )}
              <span className={styles.avatarOverlay}>
                {uploading ? "Yükleniyor…" : "Değiştir"}
              </span>
            </label>
            <input
              id="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={styles.avatarFileInput}
              onChange={uploadAvatar}
              disabled={uploading}
            />
            <p className={styles.avatarHint}>Fotoğrafa tıkla, yeni fotoğraf seç</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ad Soyad</label>
            <input
              className={styles.formInput}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ad Soyad"
              maxLength={60}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Kullanıcı Adı</label>
            <div className={styles.usernameWrap}>
              <span className={styles.atSign}>@</span>
              <input
                className={`${styles.formInput} ${styles.usernameInput}`}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                placeholder="kullanici_adi"
                maxLength={30}
              />
            </div>
            <p className={styles.fieldHint}>Yalnızca harf, rakam ve alt çizgi</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Bio</label>
            <textarea
              className={styles.formTextarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kendini kısaca tanıt…"
              maxLength={160}
              rows={3}
            />
            <p className={styles.fieldHint}>{bio.length}/160</p>
          </div>

          {saveError && <p className={styles.saveError}>{saveError}</p>}

          <button
            className={styles.saveBtn}
            onClick={saveProfile}
            disabled={saving || !fullName.trim() || !username.trim()}
          >
            {saving ? "Kaydediliyor…" : saved ? "✓ Kaydedildi" : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>

      {/* ── Hesap ───────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Hesap</p>
        <div className={styles.list}>
          <Link to="/sifre-degistir" className={styles.item}>
            <span className={styles.itemIcon}>🔑</span>
            <span className={styles.itemLabel}>Şifre Değiştir</span>
            <span className={styles.chevron}>›</span>
          </Link>
          <Link to="/bildirimler" className={styles.item}>
            <span className={styles.itemIcon}>🔔</span>
            <span className={styles.itemLabel}>Bildirimler</span>
            <span className={styles.chevron}>›</span>
          </Link>
          <Link to="/gizlilik" className={styles.item}>
            <span className={styles.itemIcon}>🔒</span>
            <span className={styles.itemLabel}>Gizlilik</span>
            <span className={styles.chevron}>›</span>
          </Link>
        </div>
      </div>

      {/* ── Uygulama ────────────────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Uygulama</p>
        <div className={styles.list}>
          <Link to="/yardim" className={styles.item}>
            <span className={styles.itemIcon}>❓</span>
            <span className={styles.itemLabel}>Yardım</span>
            <span className={styles.chevron}>›</span>
          </Link>
          <Link to="/kullanim-kosullari" className={styles.item}>
            <span className={styles.itemIcon}>📄</span>
            <span className={styles.itemLabel}>Kullanım Koşulları</span>
            <span className={styles.chevron}>›</span>
          </Link>
        </div>
      </div>

      {/* ── Gizlenen İçerikler ──────────────────── */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>
          Gizlenen İçerikler
          {(blockedStories.length + blockedUsers.length) > 0 && (
            <span className={styles.hiddenCount}>{blockedStories.length + blockedUsers.length}</span>
          )}
        </p>
        {blockedStories.length === 0 && blockedUsers.length === 0 ? (
          <div className={styles.hiddenEmpty}>Gizlenen içerik yok.</div>
        ) : (
          <div className={styles.list}>
            {blockedStories.map(s => (
              <div key={s.story_id} className={styles.hiddenItem}>
                <span className={styles.hiddenIcon}>📖</span>
                <span className={styles.hiddenLabel}>{s.story_title || "İsimsiz hikaye"}</span>
                <button className={styles.unblockBtn} onClick={() => unblockStory(s.story_id)}>Göster</button>
              </div>
            ))}
            {blockedUsers.map(u => (
              <div key={u.blocked_user_id} className={styles.hiddenItem}>
                <span className={styles.hiddenIcon}>👤</span>
                <span className={styles.hiddenLabel}>{u.blocked_user_name || "Bilinmeyen yazar"}</span>
                <button className={styles.unblockBtn} onClick={() => unblockUser(u.blocked_user_id)}>Göster</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Çıkış ───────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.list}>
          <button className={`${styles.item} ${styles.danger}`} onClick={signOut}>
            <span className={styles.itemIcon}>🚪</span>
            <span className={styles.itemLabel}>Çıkış Yap</span>
            <span className={styles.chevron}>›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
