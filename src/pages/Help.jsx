import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Help.module.css";

const KONU_OPTIONS = ["Teknik Sorun", "Hesap", "İçerik Şikayeti", "Diğer"];

const FAQ = [
  {
    q: "Hesabımı nasıl silebilirim?",
    a: "Profilinize gidin → Ayarlar → Gizlilik → \"Verilerimin Silinmesini Talep Et\" butonuna tıklayın. Talebiniz 30 gün içinde işleme alınır ve tüm verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.",
  },
  {
    q: "Hikayemi nasıl yayınlarım?",
    a: "Alt menüden \"Hikayem\" bölümüne gidin. \"+ Yeni Hikaye Yaz\" butonuna tıklayın. Başlık, bölümler ve kapak rengini belirleyin. Taslak olarak kaydedebilir ya da anında yayınlayabilirsiniz. Yayınlanan hikayeler Keşfet akışında görünmeye başlar.",
  },
  {
    q: "Bağlantı talebi nasıl çalışır?",
    a: "Bir hikayenin altındaki \"Bağlantı\" butonuna bastığınızda, o hikayenin yazarına bağlantı talebi gönderilir. Yazar talebi kabul ederse her ikinizin Bağlantılarım listesine eklenir. Bağlantılar, özel mesajlaşma ve özel içerik erişimi sağlar.",
  },
  {
    q: "Canlı yayın nasıl açabilirim?",
    a: "Canlı yayın özelliği, en az 1 yayınlanmış hikayesi olan hesaplar için aktiftir. Hikayem sayfanızdan \"Canlı Yayın Başlat\" seçeneğine ulaşabilirsiniz. Yayın başlamadan önce konu başlığı belirtmeniz ve en az 24 saat önceden programlamanız önerilir.",
  },
  {
    q: "İçerik şikayeti nasıl bildiririm?",
    a: "Herhangi bir hikaye ya da yorumun sağ üst köşesindeki \"...\" menüsünden \"Şikayet Et\" seçeneğine tıklayın. Şikayetiniz 48 saat içinde incelenir. Ciddi ihlaller için içerik kaldırılır ve hesap uyarı alır ya da askıya alınır.",
  },
  {
    q: "Yer imi ile rafıma almak arasındaki fark nedir?",
    a: "\"Yer İmi\", okumayı bıraktığınız yeri işaretler; bir dahaki açışınızda kaldığınız bölümden devam edersiniz. \"Rafıma Al\" ise hikayeyi profilinizdeki Rafım sekmenize ekler ve takip listenize girer; yazarın yeni bölüm eklemesi durumunda bildirim alırsınız.",
  },
];

const EMPTY_FORM = { name: "", email: "", konu: "", mesaj: "" };

export default function Help() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(false);

  function toggle(i) {
    setOpen((prev) => (prev === i ? null : i));
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setToast(true);
    setForm(EMPTY_FORM);
    setTimeout(() => setToast(false), 4000);
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <ChevronLeft />
        </button>
        <h1 className={styles.title}>Yardım</h1>
      </div>

      <div className={styles.content}>
        {/* Search hint */}
        <div className={styles.searchHint}>
          <QuestionIcon />
          <p>Sık sorulan sorular aşağıda listelenmiştir. Cevabını bulamazsan bize yaz.</p>
        </div>

        {/* FAQ Accordion */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Sık Sorulan Sorular</h2>
          <div className={styles.accordion}>
            {FAQ.map((item, i) => (
              <div key={i} className={`${styles.item} ${open === i ? styles.itemOpen : ""}`}>
                <button className={styles.question} onClick={() => toggle(i)}>
                  <span className={styles.questionText}>{item.q}</span>
                  <span className={`${styles.chevron} ${open === i ? styles.chevronOpen : ""}`}>
                    <ChevronDown />
                  </span>
                </button>
                {open === i && (
                  <div className={styles.answer}>
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Bize Ulaşın</h2>
          <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="help-name">Ad Soyad</label>
              <input
                id="help-name"
                name="name"
                className={styles.input}
                type="text"
                placeholder="Adınız ve soyadınız"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="help-email">E-posta</label>
              <input
                id="help-email"
                name="email"
                className={styles.input}
                type="email"
                placeholder="ornek@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="help-konu">Konu</label>
              <select
                id="help-konu"
                name="konu"
                className={styles.select}
                value={form.konu}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Konu seçin</option>
                {KONU_OPTIONS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="help-mesaj">Mesaj</label>
              <textarea
                id="help-mesaj"
                name="mesaj"
                className={styles.textarea}
                placeholder="Sorununuzu veya önerinizi buraya yazın…"
                rows={4}
                value={form.mesaj}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className={styles.sendBtn}>
              <SendIcon />
              Gönder
            </button>
          </form>
        </div>

        {/* Other contacts */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Diğer İletişim</h2>
          <div className={styles.contactCard}>
            <div className={styles.contactItem}>
              <div className={styles.contactIcon}><ShieldIcon /></div>
              <div>
                <p className={styles.contactLabel}>KVKK / Gizlilik</p>
                <a href="mailto:kvkk@untold.app" className={styles.contactValue}>
                  kvkk@untold.app
                </a>
                <p className={styles.contactMeta}>Kişisel veri talepleri için</p>
              </div>
            </div>
            <div className={styles.contactDivider} />
            <div className={styles.contactItem}>
              <div className={styles.contactIcon}><FlagIcon /></div>
              <div>
                <p className={styles.contactLabel}>İçerik Şikayeti</p>
                <a href="mailto:icerik@untold.app" className={styles.contactValue}>
                  icerik@untold.app
                </a>
                <p className={styles.contactMeta}>48 saat içinde inceleme</p>
              </div>
            </div>
          </div>
        </div>

        <p className={styles.version}>Untold v1.0.0 · © 2026 Untold Teknoloji A.Ş.</p>
      </div>

      {/* Toast */}
      <div className={`${styles.toast} ${toast ? styles.toastVisible : ""}`}>
        <CheckCircleIcon />
        <span>Mesajınız alındı, en kısa sürede dönüş yapacağız.</span>
      </div>
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

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--terracotta)" }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
