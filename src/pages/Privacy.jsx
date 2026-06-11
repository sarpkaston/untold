import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Privacy.module.css";

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Herkes", desc: "Profiliniz ve hikayeleriniz herkese açık" },
  { value: "connections", label: "Sadece Bağlantılar", desc: "Yalnızca bağlantılarınız içeriklerinizi görebilir" },
  { value: "private", label: "Gizli", desc: "Profiliniz arama sonuçlarında görünmez" },
];

export default function Privacy() {
  const navigate = useNavigate();
  const [visibility, setVisibility] = useState(
    () => localStorage.getItem("privacy_visibility") || "public"
  );
  const [thirdParty, setThirdParty] = useState(
    () => localStorage.getItem("privacy_third_party") !== "false"
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  function handleVisibility(val) {
    setVisibility(val);
    localStorage.setItem("privacy_visibility", val);
  }

  function handleThirdParty() {
    const next = !thirdParty;
    setThirdParty(next);
    localStorage.setItem("privacy_third_party", String(next));
  }

  function handleDeleteRequest() {
    setShowDeleteConfirm(false);
    setDeleteRequested(true);
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <ChevronLeft />
        </button>
        <h1 className={styles.title}>Gizlilik</h1>
      </div>

      <div className={styles.content}>
        {/* KVKK Banner */}
        <div className={styles.kvkkBanner}>
          <ShieldIcon />
          <div>
            <p className={styles.kvkkTitle}>KVKK Kapsamında Haklarınız</p>
            <p className={styles.kvkkText}>
              6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca kişisel verilerinize erişme,
              düzeltme, silme ve aktarım talep etme haklarına sahipsiniz.
            </p>
            <Link to="/kullanim-kosullari" className={styles.kvkkLink}>
              Gizlilik Politikasını Oku →
            </Link>
          </div>
        </div>

        {/* Profil Görünürlüğü */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Profil Görünürlüğü</h2>
          <div className={styles.card}>
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.radioRow} ${visibility === opt.value ? styles.radioRowActive : ""}`}
                onClick={() => handleVisibility(opt.value)}
              >
                <div className={styles.radioLeft}>
                  <span className={`${styles.radio} ${visibility === opt.value ? styles.radioChecked : ""}`}>
                    {visibility === opt.value && <span className={styles.radioDot} />}
                  </span>
                  <div>
                    <p className={styles.radioLabel}>{opt.label}</p>
                    <p className={styles.radioDesc}>{opt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Veri Paylaşımı */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Veri Paylaşımı</h2>
          <div className={styles.card}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <p className={styles.toggleLabel}>Üçüncü Taraf Veri Paylaşımı</p>
                <p className={styles.toggleDesc}>
                  İçerik önerilerini iyileştirmek amacıyla anonim kullanım verilerinin
                  analiz ortaklarıyla paylaşılmasına izin verin
                </p>
              </div>
              <button
                className={`${styles.toggle} ${thirdParty ? styles.toggleOn : ""}`}
                onClick={handleThirdParty}
                aria-label={thirdParty ? "Kapat" : "Aç"}
              >
                <span className={styles.knob} />
              </button>
            </div>
          </div>
        </div>

        {/* Çerez Politikası */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Çerez Politikası</h2>
          <div className={`${styles.card} ${styles.cookieCard}`}>
            <p className={styles.cookieText}>
              Untold, hizmetleri sunmak için zorunlu çerezler ve deneyiminizi iyileştirmek için
              analitik çerezler kullanır. Zorunlu çerezler devre dışı bırakılamaz; analitik
              çerezler için yukarıdaki "Üçüncü Taraf Veri Paylaşımı" seçeneğini kullanabilirsiniz.
            </p>
            <div className={styles.cookieTypes}>
              <CookieItem label="Zorunlu Çerezler" status="Her zaman aktif" active />
              <CookieItem label="Analitik Çerezler" status={thirdParty ? "Aktif" : "Devre dışı"} active={thirdParty} />
              <CookieItem label="Pazarlama Çerezleri" status="Devre dışı" active={false} />
            </div>
          </div>
        </div>

        {/* Veri Silme */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Hesap ve Veriler</h2>
          <div className={styles.card}>
            {deleteRequested ? (
              <div className={styles.deleteSuccess}>
                <p className={styles.deleteSuccessText}>
                  ✓ Veri silme talebiniz alındı. 30 gün içinde işleme konulacak ve sonucu e-posta ile bildirilecektir.
                </p>
              </div>
            ) : (
              <button
                className={styles.deleteBtn}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <TrashIcon />
                Verilerimin Silinmesini Talep Et
              </button>
            )}
          </div>
        </div>

        <p className={styles.contact}>
          Gizlilik ile ilgili sorularınız için:{" "}
          <a href="mailto:kvkk@untold.app" className={styles.contactLink}>kvkk@untold.app</a>
        </p>
      </div>

      {/* Silme Onay Modalı */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Veri Silme Talebi</h3>
            <p className={styles.modalText}>
              Bu işlem, hesabınız ve tüm verileriniz (hikayeler, bağlantılar, yorumlar) için
              kalıcı silme talebinde bulunacaktır. İşlem 30 gün içinde tamamlanır ve geri alınamaz.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowDeleteConfirm(false)}>
                Vazgeç
              </button>
              <button className={styles.modalConfirm} onClick={handleDeleteRequest}>
                Talep Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CookieItem({ label, status, active }) {
  return (
    <div className={styles.cookieItem}>
      <span className={styles.cookieLabel}>{label}</span>
      <span className={`${styles.cookieStatus} ${active ? styles.cookieStatusActive : ""}`}>
        {status}
      </span>
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

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--terracotta)" }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
