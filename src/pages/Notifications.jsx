import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Notifications.module.css";

const PREFS = [
  {
    key: "new_story",
    label: "Yeni Hikaye Bildirimleri",
    desc: "Bağlantılarınız yeni hikaye yayınladığında bildirim alın",
    default: true,
  },
  {
    key: "connection_req",
    label: "Bağlantı Talepleri",
    desc: "Birisi sizinle bağlantı kurmak istediğinde bildirim alın",
    default: true,
  },
  {
    key: "comments",
    label: "Yorum Bildirimleri",
    desc: "Hikayelerinize yorum yapıldığında bildirim alın",
    default: true,
  },
  {
    key: "live_session",
    label: "Canlı Yayın Başladı",
    desc: "Takip ettiğiniz bir yazar canlı yayın başlattığında bildirim alın",
    default: true,
  },
];

const EMAIL_PREFS = [
  {
    key: "weekly_digest",
    label: "Haftalık Özet E-postası",
    desc: "Platformdaki güncel hikayeler ve öneriler hakkında haftalık özet",
    default: true,
  },
  {
    key: "marketing",
    label: "Pazarlama Bildirimleri",
    desc: "Untold'un yeni özellikleri ve kampanyaları hakkında e-posta alın",
    default: false,
  },
];

function usePref(key, defaultVal) {
  const stored = localStorage.getItem(`notif_${key}`);
  const [val, setVal] = useState(stored !== null ? stored === "true" : defaultVal);
  function toggle() {
    const next = !val;
    setVal(next);
    localStorage.setItem(`notif_${key}`, String(next));
  }
  return [val, toggle];
}

export default function Notifications() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Geri">
          <ChevronLeft />
        </button>
        <h1 className={styles.title}>Bildirimler</h1>
      </div>

      <div className={styles.content}>
        <Section title="Uygulama Bildirimleri">
          {PREFS.map((p) => (
            <PrefRow key={p.key} pref={p} />
          ))}
        </Section>

        <Section title="E-posta Bildirimleri">
          {EMAIL_PREFS.map((p) => (
            <PrefRow key={p.key} pref={p} />
          ))}
        </Section>

        <p className={styles.note}>
          Bildirim tercihleriniz cihazınızda saklanır. Tüm bildirimleri kapatmak için cihazınızın sistem ayarlarını kullanabilirsiniz.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.card}>{children}</div>
    </div>
  );
}

function PrefRow({ pref }) {
  const [on, toggle] = usePref(pref.key, pref.default);
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <p className={styles.rowLabel}>{pref.label}</p>
        <p className={styles.rowDesc}>{pref.desc}</p>
      </div>
      <button
        className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}
        onClick={toggle}
        aria-label={on ? "Kapat" : "Aç"}
        role="switch"
        aria-checked={on}
      >
        <span className={styles.knob} />
      </button>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
