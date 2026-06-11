import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Terms.module.css";

const TERMS_CONTENT = [
  {
    heading: "1. Hizmet Tanımı",
    text: `Untold, kullanıcıların hayat hikayelerini kitap formatında yazıp paylaşabildiği, diğer okuyucularla bağlantı kurabildiği ve yazarlarla canlı oturumlar aracılığıyla buluşabildiği Türkiye merkezli bir sosyal hikaye platformudur. Platform; hikaye okuma, yorum yapma, rafıma ekleme, canlı yayın izleme ve yazar-okuyucu bağlantısı kurma hizmetlerini kapsamaktadır.`,
  },
  {
    heading: "2. Hesap Oluşturma ve Güvenlik",
    text: `Platform hizmetlerinden tam anlamıyla yararlanmak için hesap oluşturmanız zorunludur. Hesabınızı oluştururken gerçek, güncel ve doğru bilgi sağlamanız gerekmektedir. Hesabınızın güvenliğinden ve şifrenizin gizliliğinden yalnızca siz sorumlusunuz. Hesabınızda gerçekleşen tüm işlemler size ait kabul edilir. Şüpheli bir etkinlik fark ettiğinizde derhal destek@untold.app adresine bildirmeniz gerekmektedir. 13 yaşın altındaki bireyler platforma kayıt yaptıramaz.`,
  },
  {
    heading: "3. İçerik Politikası",
    text: `Platformda paylaştığınız tüm içeriklerden hukuki olarak siz sorumlusunuz. Aşağıdaki içerikler kesinlikle yasaktır:
• Nefret söylemi, ayrımcılık veya şiddete teşvik
• Müstehcen ya da uygunsuz cinsel içerik
• Başkalarına ait telif hakkı korumalı içeriklerin izinsiz paylaşımı
• Yanıltıcı, sahte veya manipülatif bilgi
• Kişisel saldırı, taciz veya tehdit niteliğindeki içerik
• Yasadışı faaliyet veya ürün tanıtımı

Untold, bu politikaya aykırı içerikleri önceden bildiri yapmaksızın kaldırma, ilgili hesabı askıya alma veya kalıcı olarak silme hakkını saklı tutar.`,
  },
  {
    heading: "4. Fikri Mülkiyet Hakları",
    text: `Platformda yayımladığınız hikayeler, metinler, görseller ve diğer içeriklerin tüm telif hakları size aittir. Untold'a yalnızca platforma özgü, devredilemez ve alt lisans verilemez, hizmetin işletilmesi amacıyla sınırlı bir kullanım lisansı vermektesiniz. Bu lisans; içeriğinizi görüntüleme, depolama, dizinleme ve kullanıcılara sunma haklarını kapsar. Untold markası, logosu, arayüz tasarımı ve tüm özgün içeriklerin fikri mülkiyet hakları Untold Teknoloji A.Ş.'ye aittir. Bu varlıklar yazılı izin olmaksızın kullanılamaz.`,
  },
  {
    heading: "5. Hizmetin Kullanımı",
    text: `Platform yalnızca kişisel, ticari olmayan amaçlarla kullanılabilir. Otomatik veri çekme (scraping), bot kullanımı, platform altyapısını tehdit eden eylemler ve sistemi aşırı yükleyen saldırılar kesinlikle yasaktır. Untold, hizmetin kesintisiz ve hatasız çalışacağını garanti etmez. Bakım, güncelleme veya beklenmedik teknik nedenlerle hizmet geçici olarak kullanılamayabilir.`,
  },
  {
    heading: "6. Sorumluluk Sınırlaması",
    text: `Untold, kullanıcılar tarafından üretilen içeriklerden kaynaklanan zararlardan sorumlu değildir. Platform "olduğu gibi" (as-is) sunulmaktadır; belirli bir amaca uygunluk veya kesintisizlik konusunda açık ya da örtülü herhangi bir garanti verilmemektedir. Untold'un herhangi bir zarardaki sorumluluğu, zarar doğuran olaydan önceki 12 aylık dönemde ödediğiniz abonelik ücretiyle sınırlıdır.`,
  },
  {
    heading: "7. Hesap Feshi",
    text: `Hesabınızı dilediğiniz zaman kapatabilirsiniz. Untold, bu Koşullar'ı ihlal etmeniz halinde hesabınızı önceden bildiri yapmaksızın askıya alabilir veya silebilir. Hesap kapatıldığında tüm içerikleriniz platforma erişilemez hale gelir; verilerinizin saklanması KVKK kapsamındaki zorunlu sürelerle sınırlıdır.`,
  },
  {
    heading: "8. Değişiklikler",
    text: `Untold, bu Kullanım Koşulları'nı önceden bildirim yaparak güncelleme hakkını saklı tutar. Önemli değişiklikler e-posta yoluyla veya platform üzerinden duyurulur. Değişiklikten sonra platformu kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.`,
  },
  {
    heading: "9. Uygulanacak Hukuk ve Uyuşmazlık Çözümü",
    text: `Bu Kullanım Koşulları, Türk Hukuku'na tabidir ve Türk Hukuku'na uygun biçimde yorumlanır. Bu Koşullar'dan doğan her türlü uyuşmazlığın çözümünde İstanbul Merkez Mahkemeleri ve İcra Müdürlükleri yetkilidir.`,
  },
  {
    heading: "10. İletişim",
    text: `Bu Kullanım Koşulları hakkındaki sorularınız için:\n\nUntold Teknoloji A.Ş.\nE-posta: destek@untold.app\nAdres: İstanbul, Türkiye`,
  },
];

const PRIVACY_CONTENT = [
  {
    heading: "1. Veri Sorumlusu",
    text: `6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu:\n\nUntold Teknoloji A.Ş.\nİstanbul, Türkiye\nkvkk@untold.app`,
  },
  {
    heading: "2. İşlenen Kişisel Veriler",
    text: `Platform hizmetleri kapsamında aşağıdaki kişisel veriler işlenebilir:\n\n• Kimlik Bilgileri: Ad, soyad, kullanıcı adı\n• İletişim Bilgileri: E-posta adresi\n• Hesap Bilgileri: Profil fotoğrafı, biyografi, tercihler\n• İçerik Verileri: Paylaşılan hikayeler, yorumlar, beğeniler\n• Kullanım Verileri: Sayfa görüntüleme, oturum süresi, tıklama verileri\n• Teknik Veriler: IP adresi, tarayıcı türü, işletim sistemi, cihaz kimliği`,
  },
  {
    heading: "3. İşleme Amaçları ve Hukuki Dayanaklar",
    text: `Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:\n\n• Hizmetin sunulması ve yürütülmesi (KVKK md. 5/2-c: sözleşmenin ifası)\n• Hesap güvenliğinin sağlanması (KVKK md. 5/2-f: meşru menfaat)\n• Yasal yükümlülüklerin yerine getirilmesi (KVKK md. 5/2-ç)\n• İçerik önerilerinin kişiselleştirilmesi (KVKK md. 5/1: açık rıza)\n• Pazarlama ve tanıtım faaliyetleri (KVKK md. 5/1: açık rıza)`,
  },
  {
    heading: "4. Veri Saklama Süreleri",
    text: `• Hesap verileri: Hesap aktif olduğu sürece + hesap silme tarihinden itibaren 3 yıl\n• Teknik loglar: 1 yıl\n• Finansal işlem kayıtları: 10 yıl (Vergi Usul Kanunu gereği)\n• Hukuki uyuşmazlık verileri: Uyuşmazlık sonuçlanana kadar\n\nSaklama süreleri dolduğunda veriler anonim hale getirilir veya güvenli biçimde imha edilir.`,
  },
  {
    heading: "5. Yurt İçi ve Yurt Dışı Veri Aktarımı",
    text: `Verileriniz; hizmetin sunulması amacıyla Türkiye'de ve yurt dışında (AB ülkeleri dahil) bulunan güvenilir altyapı sağlayıcılarına aktarılabilir. Yurt dışı aktarımlar, KVKK'nın 9. maddesi kapsamında yeterli güvenlik önlemleri alınarak gerçekleştirilir. Üçüncü taraflarla pazarlama amacıyla veri paylaşımı yalnızca açık rızanıza dayalıdır.`,
  },
  {
    heading: "6. KVKK Kapsamındaki Haklarınız",
    text: `6698 sayılı Kanun'un 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:\n\n• Kişisel verilerinizin işlenip işlenmediğini öğrenme\n• Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme\n• İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme\n• Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri öğrenme\n• Eksik veya yanlış işlenen verilerin düzeltilmesini isteme\n• Verilerin silinmesini veya yok edilmesini talep etme\n• Otomatik sistemlerle analiz sonucu aleyhinize çıkan karara itiraz etme\n• Kanuna aykırı işleme nedeniyle uğradığınız zararın giderilmesini talep etme\n\nBu haklarınızı kullanmak için kvkk@untold.app adresine yazılı başvuruda bulunabilirsiniz.`,
  },
  {
    heading: "7. Çerez Politikası",
    text: `Untold, platformu güvenli ve işlevsel kılmak için çerezler kullanır:\n\n• Zorunlu Çerezler: Oturum yönetimi ve güvenlik için gereklidir; devre dışı bırakılamaz.\n• Analitik Çerezler: Sayfa performansını ölçmek amacıyla anonim veriler toplar. Gizlilik ayarlarından yönetilebilir.\n• Pazarlama Çerezleri: Kişiselleştirilmiş içerik sunmak için kullanılır. Açık rızanıza dayanır.\n\nÇerezleri tarayıcı ayarlarınızdan yönetebilirsiniz; ancak zorunlu çerezlerin devre dışı bırakılması platforma erişimi olumsuz etkileyebilir.`,
  },
  {
    heading: "8. Güvenlik Önlemleri",
    text: `Kişisel verileriniz; şifreleme (TLS/SSL), erişim kontrolleri ve düzenli güvenlik denetimleri aracılığıyla yetkisiz erişime, kaybedilmeye, değiştirilmeye veya ifşa edilmeye karşı korunmaktadır. Veri ihlali durumunda KVKK'nın 12. maddesi kapsamında 72 saat içinde Kişisel Verileri Koruma Kurulu'na bildirim yapılır ve etkilenen kullanıcılar bilgilendirilir.`,
  },
  {
    heading: "9. İletişim ve Başvuru",
    text: `Gizlilik Politikası ve KVKK haklarınıza ilişkin her türlü soru, talep ve şikayetleriniz için:\n\nE-posta: kvkk@untold.app\nYanıt süresi: 30 gün\n\nKişisel Verileri Koruma Kurumu'na da başvuruda bulunabilirsiniz: www.kvkk.gov.tr`,
  },
];

export default function Terms() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("terms");
  const content = activeTab === "terms" ? TERMS_CONTENT : PRIVACY_CONTENT;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <ChevronLeft />
        </button>
        <h1 className={styles.title}>
          {activeTab === "terms" ? "Kullanım Koşulları" : "Gizlilik Politikası"}
        </h1>
      </div>

      {/* Tab toggle */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "terms" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("terms")}
        >
          Kullanım Koşulları
        </button>
        <button
          className={`${styles.tab} ${activeTab === "privacy" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("privacy")}
        >
          Gizlilik Politikası
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.meta}>
          <p className={styles.effectiveDate}>Son güncelleme: 10 Haziran 2026</p>
          {activeTab === "terms" && (
            <p className={styles.intro}>
              Bu Kullanım Koşulları, Untold platformuna erişiminizi ve kullanımınızı düzenler.
              Platformu kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.
            </p>
          )}
          {activeTab === "privacy" && (
            <p className={styles.intro}>
              Bu Gizlilik Politikası, 6698 sayılı KVKK kapsamında kişisel verilerinizin
              nasıl toplandığını, işlendiğini ve korunduğunu açıklamaktadır.
            </p>
          )}
        </div>

        {content.map((section, i) => (
          <div key={i} className={styles.section}>
            <h2 className={styles.sectionHeading}>{section.heading}</h2>
            <p className={styles.sectionText}>{section.text}</p>
          </div>
        ))}

        <div className={styles.footer}>
          <div className={styles.footerBox}>
            <p className={styles.footerText}>
              {activeTab === "terms"
                ? "Bu koşullar hakkında sorularınız için:"
                : "KVKK haklarınız için:"}{" "}
              <a
                href={`mailto:${activeTab === "terms" ? "destek" : "kvkk"}@untold.app`}
                className={styles.footerLink}
              >
                {activeTab === "terms" ? "destek" : "kvkk"}@untold.app
              </a>
            </p>
            <p className={styles.footerCompany}>Untold Teknoloji A.Ş. · İstanbul, Türkiye</p>
          </div>
        </div>
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
