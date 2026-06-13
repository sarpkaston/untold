import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { PRESET_CATEGORIES, getInitials } from "../lib/storyUtils";
import styles from "./Write.module.css";

const DEFAULT_QUESTIONS = [
  "Ne zaman ağladın ama kimseye söylemedin?",
  "Hayatındaki en büyük dönüm noktası neydi?",
  "10 yıl sonra kendine ne söylerdin?",
  "Kimden en çok etkilendin ve neden?",
  "Pişman olduğun bir karar var mı?",
];

const INTEREST_PROMPTS = {
  "aşk": [
    "İlk aşkının sana kattığı en önemli şeyi anlat.",
    "Platonic bir aşkı yaşadın mı hiç? Nasıl hissettirdi?",
    "Aşkın bittiğini fark ettiğin o anı hatırlıyor musun?",
    "Seni seven biri için aynı şeyi hissetmediğin bir dönem oldu mu?",
    "Uzak mesafe ilişkisi yaşadın mı? Ne öğretti?",
  ],
  "aile": [
    "Anne veya babanla kurduğun en zor konuşmayı anlat.",
    "Kardeşinle olan bir anını hikayeleştir.",
    "Büyükanne ya da büyükbabadan öğrendiğin en değerli şey neydi?",
    "Aile olmak kan mı, seçim mi — sen ne düşünüyorsun?",
    "Ailenin sana ilettiği bir geleneği ve ne ifade ettiğini anlat.",
  ],
  "kariyer": [
    "İlk işe girdiğinde içinde neler geçti?",
    "Kariyerinde 'bu yanlış yol' dediğin bir dönem oldu mu?",
    "Çalıştığın birinden öğrendiğin en değerli ders neydi?",
    "Patronunla yaşadığın en zorlu anı anlat.",
    "Bir işi bırakmak zorunda kaldığında ne hissettin?",
  ],
  "sağlık": [
    "Hastanede geçirdiğin bir geceyi anlat.",
    "Bedeninin sana dürüst olmadığını ne zaman fark ettin?",
    "Mental sağlığına öncelik vermeye başladığın anı hatırlıyor musun?",
    "Doktorun sana söylediği bir şey hayatını değiştirdi mi?",
    "Uyku düzenin seni en çok ne zaman etkiledi?",
  ],
  "spor": [
    "Futbol maçında veya sahada yaşadığın en yoğun anı anlat.",
    "Basketbolda son saniye sayısı gibi bir karar aldın mı hayatında?",
    "Koşu sırasında aklından neler geçiyor — hiç yazdın mı?",
    "Takım sporunda öğrendiğin en değerli şey neydi?",
    "Favori sporcuna olan hayranlığını ve sebebini anlat.",
    "Sporda kaybetmenin sana verdiği en büyük ders neydi?",
  ],
  "psikoloji": [
    "Kendinle ilgili kabul etmekte en çok zorlandığın şey nedir?",
    "Farkında olmadan tekrarladığın bir davranış örüntüsü var mı?",
    "Terapiye gittin mi? Sana ne öğretti?",
    "Savunma mekanizman nedir — inkâr mı, yansıtma mı, kaçınma mı?",
    "Bağlanma biçimin ilişkilerini nasıl şekillendirdi?",
  ],
  "müzik": [
    "Bir şarkı seni neden ağlatır — o şarkıyı ve hikayesini anlat.",
    "Konserde veya festivalde yaşadığın en unutulmaz anı yaz.",
    "Çocukluğunda dinlediğin müzikler sana ne hatırlatıyor?",
    "Bir enstrüman çalmayı öğrendin mi? Nasıl bir deneyimdi?",
    "Söz yazan biri olsaydın ilk şarkın ne hakkında olurdu?",
  ],
  "edebiyat": [
    "Seni en çok etkileyen kitabı ve nedenini anlat.",
    "Hangi roman karakteriyle kendin arasında paralellik görüyorsun?",
    "Aklından hiç çıkmayan bir kitap cümlesi var mı?",
    "Dostoyevski, Kafka veya başka bir yazar seni nasıl etkiledi?",
    "Bir kitabı bitirince boşluk mu hissediyorsun, doyum mu?",
  ],
  "girişimcilik": [
    "İlk iş fikrini ve ne olduğunu anlat.",
    "Başarısız olan bir girişiminden ne öğrendin?",
    "Bir ortak anlaşmazlığını ve nasıl çözdüğünü anlat.",
    "Startup hayatında en zor karar hangisiydi?",
    "Herkes 'yanlış' dedi ama pişman olmadığın bir risk neydi?",
  ],
  "seyahat": [
    "Kaybolduğun bir yolculuğu anlat — fiziksel veya duygusal.",
    "Seni en çok değiştiren şehri ve nedenini anlat.",
    "Yurt dışında ilk kez yalnız kaldığında ne hissettin?",
    "Seyahatte karşılaştığın en ilginç insanı anlat.",
    "Bir ülkede yaşadığın kültür şokunu yaz.",
  ],
  "yemek": [
    "Annenin ya da büyükannenin bir yemeğini ve hatıralarını anlat.",
    "En iyi yediğin yemeğin hikayesini yaz.",
    "Bir yemeği ilk defa pişirdiğinde ne oldu?",
    "Yabancı bir mutfağı keşfettiğinde ne hissettin?",
    "Aç kaldığın bir dönemi ve sana ne öğrettiğini anlat.",
  ],
  "teknoloji": [
    "Sosyal medyanın hayatına gerçekten nasıl girdiğini anlat.",
    "Teknolojiyle kötü bir deneyim yaşadın mı — hırsızlık, gizlilik ihlali?",
    "Yapay zeka hakkında ne hissediyorsun — umut mu, korku mu?",
    "Bir uygulamanın veya platformun seni nasıl değiştirdiğini yaz.",
    "Dijital detoks yaptın mı? Neler değişti?",
  ],
  "sinema": [
    "Seni en çok etkileyen filmi ve nedenini anlat.",
    "Bir film sahnesi için ağladın mı? Hangisi ve neden?",
    "Yönetmen olsaydın hangi hikayeyi çekerdin?",
    "Sinemayla ilk kez büyülendiğin anı hatırlıyor musun?",
    "Bir belgesel izledikten sonra düşüncen nasıl değişti?",
  ],
  "oyun": [
    "Çocukken en çok hangi oyunu oynardın ve ne hissettirirdi?",
    "Bir oyundan hayata taşıdığın bir strateji var mı?",
    "Online oyunlarda tanıştığın biriyle gerçek arkadaş oldun mu?",
    "Oyunda kaybetmenin sana verdiği en büyük ders neydi?",
    "E-spor veya rekabetçi oyun deneyimini anlat.",
  ],
  "din & inanç": [
    "İnancın en çok sınavdan geçtiği dönem hangisiydi?",
    "Namaz, dua veya meditasyon sana ne veriyor?",
    "Ramazan, bayram ya da özel bir ritüeli ve anlamını anlat.",
    "İnanç ile akıl arasındaki gerilimi nasıl yönetiyorsun?",
    "İnancını sorguladığın veya pekiştirdiğin bir an var mı?",
  ],
  "doğa": [
    "Doğada yalnız kaldığın ve içini döktüğün bir anı anlat.",
    "Deniz, dağ, orman — hangisi seni en çok huzurlandırıyor ve neden?",
    "Bir hayvanla özel bir anın oldu mu?",
    "Şehir hayatından kaçıp doğaya sığındığın bir zamanı anlat.",
    "Mevsim geçişlerinin seni nasıl etkilediğini yaz.",
  ],
  "sanat": [
    "İlk kez bir sanat eserinin karşısında donup kaldığın anı anlat.",
    "Resim, heykel, müzik, dans — hangisiyle kendini ifade etmek isterdin?",
    "Bir müzeye gittiğinde neler hissediyorsun?",
    "Yarattığın bir şeyi beğenilmesi için mi, kendin için mi yaptın?",
    "Sanat gerçekten toplumu değiştirebilir mi sence?",
  ],
  "tarih": [
    "Osmanlı'nın çöküşünden bugüne taşınan bir iz görüyor musun?",
    "Atatürk'ün en cesur kararı hangisiydi sence?",
    "Kurtuluş Savaşı'nın ruhunu günümüzde nerede hissediyorsun?",
    "Bizans'ın düşüşünden ya da başka bir imparatorluktan çıkarabileceğin bir ders nedir?",
    "Savaş dönemi yaşayan biriyle konuşabilseydin ne sorardın?",
    "Tarihin tekerrür ettiğini hissettiğin bir an oldu mu?",
  ],
  "felsefe": [
    "Sokrates 'Kendini bil' dedi — sen kendini ne kadar bildiğini düşünüyorsun?",
    "Nietzsche'nin 'Güç istenci' kavramı hayatında bir karşılık buluyor mu?",
    "Sisifos'u mutlu hayal edebilir misin? Bu sana ne hissettiriyor?",
    "Özgür iraden olduğuna inanıyor musun ve bu inanç seni nasıl etkiliyor?",
    "Platon'un mağara alegorisi gerçekliğin neresine düşüyor sence?",
    "Varoluşun anlamsızlığıyla ilk kez yüzleştiğin an neydi?",
  ],
  "eğitim": [
    "Okulda öğrendiğin en işe yaramaz şey neydi?",
    "Hayatını değiştiren bir öğretmeni anlat.",
    "Sınıfta utandığın veya gurur duyduğun bir anı yaz.",
    "Sınav kaygısının en yoğun hissettirdiği dönem hangisiydi?",
    "Üniversite seçimi süreci seni nasıl etkiledi?",
  ],
  "depresyon": [
    "En karanlık döneminde tutunduğun tek şey neydi?",
    "Depresyonu başkasına tarif etmek neden bu kadar zor?",
    "İlk kez yardım istediğin anı anlat — nasıl hissettirdi?",
    "Küçük bir şey seni nasıl o günden kurtardı?",
    "İyileşme bir anda mı geldi, yoksa yavaş yavaş mı?",
  ],
  "bağımlılık": [
    "Bağımlılığının başladığını ne zaman fark ettin?",
    "Bağımlılık sana ne veriyordu — tam olarak neyi dolduruyordu?",
    "Bırakmaya karar verdiğin o anı anlat.",
    "Relaps yaşadın mı? Kendine nasıl yaklaştın?",
    "Mücadelede en çok kim veya ne yardımcı oldu?",
  ],
  "kayıp": [
    "Kaybettiğin biriyle vedalaşabilseydin ne söylerdin?",
    "Yas sürecinin en beklenmedik aşaması hangisiydi?",
    "Birini kaybettikten sonra değişen bir alışkanlığın veya düşüncen var mı?",
    "Kayıp sana ölüm hakkında ne öğretti?",
    "Anıyı nasıl koruyorsun — fotoğraf, nesne, ritüel?",
  ],
  "göç": [
    "Yeni bir şehire ya da ülkeye gittiğinde 'yuva' kelimesi ne anlam taşıdı?",
    "İlk günlerde en çok neye şaşırdın?",
    "İki kültür arasında kalmak nasıl bir his?",
    "Göç etmek zorunda mı kaldın, yoksa seçim miydi?",
    "Özlem duyduğun en küçük, en önemsiz şeyi anlat.",
  ],
  "travma": [
    "Travmayı kelimelerle anlatmaya çalışmak nasıl bir his?",
    "İyileşmeye başladığını fark ettiğin ilk an hangisiydi?",
    "Travmanın sana başkasında göremeyeceğin bir şey kazandırdı mı?",
    "Travma sonrası güven duygunu nasıl yeniden inşa ettin?",
    "Kendine şefkatle bakabilmeyi nasıl öğrendin?",
  ],
};

function getMinDateTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d.toISOString().slice(0, 16);
}

export default function Write() {
  const navigate = useNavigate();
  const { user } = useApp();

  const [step, setStep] = useState(1);
  const [editorTab, setEditorTab] = useState("yaz"); // "yaz" | "ilham"
  const [form, setForm] = useState({ title: "", subtitle: "", category: "", content: "" });
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Zamanlama
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");

  // Custom category autocomplete
  const [customInput, setCustomInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [sugsVisible, setSugsVisible] = useState(false);

  // Publish
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishDone, setPublishDone] = useState(false);

  // Personalized inspiration questions + category ordering
  const [inspirationQuestions, setInspirationQuestions] = useState(DEFAULT_QUESTIONS);
  const [userInterests, setUserInterests] = useState([]); // original case, e.g. ["Felsefe", "Spor"]

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("interests").eq("id", user.id).single()
      .then(({ data }) => {
        const interests = data?.interests || [];
        if (interests.length === 0) return;
        setUserInterests(interests);
        const questions = interests.map(interest => {
          const pool = INTEREST_PROMPTS[interest.toLowerCase()] || [];
          return pool[Math.floor(Math.random() * pool.length)];
        }).filter(Boolean);
        if (questions.length >= 3) setInspirationQuestions(questions);
      });
  }, [user]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function selectPreset(cat) {
    update("category", cat);
    setCustomInput("");
    setSugsVisible(false);
    setSuggestions([]);
  }

  function handleCustomChange(e) {
    const val = e.target.value;
    setCustomInput(val);
    update("category", val.trim() || "");
  }

  function selectSuggestion(name) {
    update("category", name);
    setCustomInput(name);
    setSugsVisible(false);
  }

  useEffect(() => {
    const trimmed = customInput.trim();
    if (trimmed.length < 2) { setSuggestions([]); setSugsVisible(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("categories")
        .select("name")
        .ilike("name", `%${trimmed}%`)
        .eq("is_preset", false)
        .limit(6);
      const found = data?.map((d) => d.name) ?? [];
      setSuggestions(found);
      setSugsVisible(found.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [customInput]);

  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length;
  const isPresetSelected = PRESET_CATEGORIES.includes(form.category) ||
    userInterests.some(i => i.toLowerCase() === form.category.toLowerCase());

  // Categories split: user interests first, then the rest of PRESET
  const interestCats = userInterests;
  const otherCats = PRESET_CATEGORIES.filter(
    c => !interestCats.some(i => i.toLowerCase() === c.toLowerCase())
  );

  async function handlePublish() {
    if (!user) { setPublishError("Yayınlamak için giriş yapmalısın."); return; }
    if (scheduleMode && !scheduleAt) { setPublishError("Lütfen bir tarih ve saat seç."); return; }

    setPublishing(true);
    setPublishError("");

    const realName = user.user_metadata?.full_name || user.email.split("@")[0];
    const authorName = isAnonymous ? "Anonim" : realName;
    let authorAvatar = isAnonymous ? "?" : getInitials(realName);
    if (!isAnonymous) {
      const { data: profileData } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
      if (profileData?.avatar_url) authorAvatar = profileData.avatar_url;
    }

    const normalizedCategory = form.category.trim().toLowerCase();

    if (!PRESET_CATEGORIES.includes(form.category)) {
      await supabase
        .from("categories")
        .upsert({ name: normalizedCategory, is_preset: false }, { onConflict: "name", ignoreDuplicates: true });
    }

    const { error } = await supabase.from("stories").insert({
      user_id:      user.id,
      title:        form.title.trim(),
      subtitle:     form.subtitle.trim(),
      content:      form.content,
      category:     normalizedCategory,
      is_anonymous: isAnonymous,
      author_name:  authorName,
      author_avatar: authorAvatar,
      published:    !scheduleMode,
      scheduled_at: scheduleMode ? new Date(scheduleAt).toISOString() : null,
      is_scheduled: scheduleMode,
      description:  form.subtitle.trim() || "",
    });

    setPublishing(false);
    if (error) {
      setPublishError("Hata oluştu: " + error.message);
    } else {
      setPublishDone(true);
    }
  }

  // ── Başarı ekranı ───────────────────────────────
  if (publishDone) {
    const scheduledDate = scheduleAt
      ? new Date(scheduleAt).toLocaleString("tr-TR", {
          day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
        })
      : null;

    return (
      <div className={styles.page}>
        <div className={styles.successPage}>
          <div className={styles.successCheckmark}>{scheduleMode ? "📅" : "✓"}</div>
          <h2 className={styles.successTitle}>
            {scheduleMode ? "Hikaye Planlandı!" : "Hikaye Yayınlandı!"}
          </h2>
          <p className={styles.successDesc}>
            {scheduleMode
              ? `Hikayen ${scheduledDate} tarihinde otomatik olarak yayınlanacak. Bağlan sayfasının "Yakında" bölümünde görünüyor.`
              : isAnonymous
              ? "Anonim olarak yayınlandı. Gerçek adın yalnızca profilinde görünür."
              : "Hikayeni Untold topluluğuyla paylaştın."}
          </p>
          <div className={styles.successActions}>
            <button className={styles.successPrimary} onClick={() => navigate("/")}>
              Ana Sayfaya Git
            </button>
            <button className={styles.successSecondary} onClick={() => navigate("/hikayem")}>
              Hikayelerim
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>Hikayeni Yaz</h1>
          <p className={styles.subtitle}>Her büyük hikaye tek bir cümleyle başlar.</p>
          <div className={styles.steps}>
            {["Detaylar", "Yaz", "Yayınla"].map((s, i) => (
              <div
                key={i}
                className={`${styles.step} ${step === i + 1 ? styles.stepActive : ""} ${step > i + 1 ? styles.stepDone : ""}`}
              >
                <span className={styles.stepNum}>{step > i + 1 ? "✓" : i + 1}</span>
                <span className={styles.stepLabel}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.container}>

        {/* ── STEP 1 ─────────────────────────────── */}
        {step === 1 && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Kitap Detayları</h2>
            <p className={styles.formDesc}>Okuyucular bu bilgileri görecek.</p>

            <div className={styles.fields}>
              <div className={styles.field}>
                <label className={styles.label}>Hikaye Başlığı *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Hikayene bir isim ver…"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Alt Başlık</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Bir cümleyle özetle…"
                  value={form.subtitle}
                  onChange={(e) => update("subtitle", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Kategori *</label>

                {interestCats.length > 0 && (
                  <>
                    <p className={styles.catGroupLabel}>Senin İçin</p>
                    <div className={styles.catGrid}>
                      {interestCats.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`${styles.catOption} ${form.category === cat ? styles.catSelected : ""}`}
                          onClick={() => selectPreset(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <p className={styles.catGroupLabel}>Diğer</p>
                  </>
                )}
                <div className={styles.catGrid}>
                  {otherCats.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.catOption} ${form.category === cat ? styles.catSelected : ""}`}
                      onClick={() => selectPreset(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className={styles.catCustomSection}>
                  <div className={styles.catSep}>
                    <span className={styles.catSepLine} />
                    <span className={styles.catSepText}>veya kendin yaz</span>
                    <span className={styles.catSepLine} />
                  </div>

                  <div className={styles.catCustomWrap}>
                    <input
                      className={`${styles.catCustomInput} ${!isPresetSelected && form.category ? styles.catSelected : ""}`}
                      placeholder="Örn: Çocukluk, Başarısızlık, Yurt dışı…"
                      value={customInput}
                      onChange={handleCustomChange}
                      onFocus={() => suggestions.length > 0 && setSugsVisible(true)}
                      onBlur={() => setTimeout(() => setSugsVisible(false), 150)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setSugsVisible(false);
                        if (e.key === "Enter") { e.preventDefault(); setSugsVisible(false); }
                      }}
                    />

                    {sugsVisible && (
                      <div className={styles.suggestions}>
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={styles.suggestionItem}
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isPresetSelected && form.category && (
                    <p className={styles.customSelBadge}>
                      Seçili kategori: <strong>{form.category}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              className={styles.nextBtn}
              disabled={!form.title.trim() || !form.category}
              onClick={() => setStep(2)}
            >
              Devam Et →
            </button>
          </div>
        )}

        {/* ── STEP 2 ─────────────────────────────── */}
        {step === 2 && (
          <div className={styles.editorSection}>

            {/* ── Sekme çubuğu ────────────────────── */}
            <div className={styles.editorTabs}>
              <button
                className={`${styles.editorTabBtn} ${editorTab === "yaz" ? styles.editorTabActive : ""}`}
                onClick={() => setEditorTab("yaz")}
                type="button"
              >
                ✍️ Yaz
              </button>
              <button
                className={`${styles.editorTabBtn} ${editorTab === "ilham" ? styles.editorTabActive : ""}`}
                onClick={() => setEditorTab("ilham")}
                type="button"
              >
                💡 İlham
              </button>
              <span className={styles.wordCountTab}>{wordCount} kelime</span>
            </div>

            {/* ── YAZ sekmesi ─────────────────────── */}
            {editorTab === "yaz" && (
              <>
                <div className={styles.editorCard}>
                  <div className={styles.editorHeader}>
                    <div className={styles.editorMeta}>
                      <h2 className={styles.editorTitle}>{form.title || "Başlıksız Hikaye"}</h2>
                      {form.subtitle && <p className={styles.editorSub}>{form.subtitle}</p>}
                    </div>
                  </div>
                  <textarea
                    className={styles.editor}
                    placeholder={"Hikayene burada başla…\n\nBelki bir anıyla, belki bir sahneyle. Gözünde canlandırdığın o an neydi?"}
                    value={form.content}
                    onChange={(e) => update("content", e.target.value)}
                  />
                </div>
                <div className={styles.editorTip}>
                  <span className={styles.tipDash}>—</span>
                  Duygu ve duyularla yaz. Diyalog kullan, hayatı sahnele. Mükemmel olmak zorunda değilsin, dürüst ol.
                </div>
              </>
            )}

            {/* ── İLHAM sekmesi ───────────────────── */}
            {editorTab === "ilham" && (
              <div className={styles.inspirationPanel}>

                {/* ✨ EN ÖNEMLİ SORU — sekminin mutlak tepesi */}
                <button
                  className={styles.featuredQBox}
                  type="button"
                  onClick={() => {
                    update("content", form.content + (form.content ? "\n\n" : "") + "Seni diğerlerinden ayıran ne?\n");
                    setEditorTab("yaz");
                  }}
                >
                  <div className={styles.featuredQInner}>
                    <span className={styles.featuredQLabel}>✨ En önemli soru:</span>
                    <p className={styles.featuredQText}>Seni diğerlerinden ayıran ne?</p>
                    <p className={styles.featuredQHint}>
                      Tıkla — soruyu editöre ekle ve cevapla.
                    </p>
                  </div>
                  <span className={styles.featuredQChevron}>›</span>
                </button>

                <div className={styles.inspirationSep}>
                  <span className={styles.inspirationSepLine} />
                  <span className={styles.inspirationSepText}>diğer sorular</span>
                  <span className={styles.inspirationSepLine} />
                </div>

                <div className={styles.inspirationList}>
                  {inspirationQuestions.map((q, i) => (
                    <button
                      key={i}
                      className={styles.inspirationQ}
                      type="button"
                      onClick={() => {
                        update("content", form.content + (form.content ? "\n\n" : "") + q + "\n");
                        setEditorTab("yaz");
                      }}
                    >
                      <span className={styles.inspirationArrow}>›</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.editorActions}>
              <button className={styles.backBtn} onClick={() => setStep(1)}>← Geri</button>
              <button
                className={styles.nextBtn}
                disabled={!form.content.trim()}
                onClick={() => setStep(3)}
              >
                İleri →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ─────────────────────────────── */}
        {step === 3 && (
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Yayınlamaya Hazır mısın?</h2>
            <p className={styles.formDesc}>Hikayeni yayınlamadan önce bir kez daha gözden geçir.</p>

            <div className={styles.preview}>
              <div className={styles.previewCover}>
                <div className={styles.previewCoverInner}>
                  <p className={styles.previewCat}>{form.category}</p>
                  <h3 className={styles.previewTitle}>{form.title}</h3>
                  {form.subtitle && <p className={styles.previewSub}>{form.subtitle}</p>}
                  <p className={styles.previewAnonBadge}>
                    {isAnonymous ? "👤 Anonim" : ""}
                  </p>
                </div>
              </div>
              <div className={styles.previewBody}>
                <p className={styles.previewText}>
                  {form.content.slice(0, 300)}{form.content.length > 300 ? "…" : ""}
                </p>
                <p className={styles.previewWords}>{wordCount} kelime</p>
              </div>
            </div>

            {/* ── Yazıyı Planla — inline tarih seçici ── */}
            {scheduleMode && (
              <div className={styles.schedulePicker}>
                <div className={styles.schedulePickerHeader}>
                  <span className={styles.schedulePickerTitle}>📅 Yayın Tarihi ve Saati</span>
                  <button
                    className={styles.schedulePickerClose}
                    onClick={() => { setScheduleMode(false); setScheduleAt(""); }}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="datetime-local"
                  className={styles.dateInput}
                  value={scheduleAt}
                  min={getMinDateTime()}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  autoFocus
                />
                {scheduleAt && (
                  <p className={styles.scheduleNote}>
                    Hikayen{" "}
                    <strong>
                      {new Date(scheduleAt).toLocaleString("tr-TR", {
                        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                      })}
                    </strong>{" "}
                    tarihinde yayınlanacak.{" "}
                    Bağlan → "Yakında"da görünecek, takipçiler zil ile hatırlatma alabilecek.
                  </p>
                )}
              </div>
            )}

            {/* Anonim Yayınla toggle — yayınla butonunun hemen üstünde */}
            <div className={styles.anonSection}>
              <div className={styles.anonToggleRow} onClick={() => setIsAnonymous((v) => !v)}>
                <div className={`${styles.toggleTrack} ${isAnonymous ? styles.toggleOn : ""}`}>
                  <div className={styles.toggleThumb} />
                </div>
                <div className={styles.anonText}>
                  <p className={styles.anonTitle}>Anonim Yayınla</p>
                  <p className={styles.anonDesc}>
                    {isAnonymous
                      ? "Adın gizli — yalnızca profilinde görünür"
                      : "Adın ve profil bağlantın görünür"}
                  </p>
                </div>
              </div>
            </div>

            {publishError && <div className={styles.publishError}>{publishError}</div>}

            {!user && (
              <div className={styles.loginNotice}>
                Yayınlamak için <button className={styles.loginLink} onClick={() => navigate("/")}>giriş yapmalısın</button>.
              </div>
            )}

            {/* ── Eylem butonları ───────────────────── */}
            <div className={styles.publishActions}>
              <button className={styles.backBtn} onClick={() => setStep(2)}>← Düzenle</button>

              {!scheduleMode ? (
                <>
                  <button
                    className={styles.publishBtn}
                    onClick={handlePublish}
                    disabled={publishing || !user}
                  >
                    {publishing ? "Yayınlanıyor…" : "Şimdi Yayınla"}
                  </button>
                  <button
                    className={styles.writePlanBtn}
                    onClick={() => setScheduleMode(true)}
                    type="button"
                    disabled={!user}
                  >
                    📅 Yazıyı Planla
                  </button>
                </>
              ) : (
                <button
                  className={styles.publishBtn}
                  onClick={handlePublish}
                  disabled={publishing || !user || !scheduleAt}
                  style={{ background: "#d97706" }}
                >
                  {publishing ? "Planlanıyor…" : "📅 Bu Tarihte Yayınla"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
