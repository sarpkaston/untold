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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

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
      });
  }, [user]);

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
            <div className={styles.profileAvatar}>{initials}</div>
            <p className={styles.avatarHint}>Avatar harfleri ad soyadından oluşuyor</p>
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
