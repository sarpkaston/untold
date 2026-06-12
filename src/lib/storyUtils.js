export const PRESET_CATEGORIES = [
  "Aşk", "Aile", "Kariyer", "Sağlık", "Bağımlılık",
  "Göç", "Kayıp", "Girişimcilik", "Depresyon", "Boşanma",
  "İflas", "Travma", "Kimlik", "Anı", "Nesiller",
  "Emek", "Arkadaşlık", "Eğitim", "Din & İnanç",
  "Yalnızlık", "Hastalık", "Engellilik",
];

const CATEGORY_COLORS = {
  "Aşk":          "#7B5EA7",
  "Aile":         "#8B4513",
  "Kariyer":      "#4A6B8A",
  "Sağlık":       "#4A8A6B",
  "Bağımlılık":   "#8A4A6B",
  "Göç":          "#4A5B8A",
  "Kayıp":        "#5B6B7A",
  "Girişimcilik": "#8A6B2A",
  "Depresyon":    "#4A5B6B",
  "Boşanma":      "#8A4A4A",
  "İflas":        "#8A5B2A",
  "Travma":       "#6B4040",
  "Kimlik":       "#2A7B8A",
  "Anı":          "#9B6B3A",
  "Nesiller":     "#5B7B6A",
  "Emek":         "#7B5B3A",
  "Arkadaşlık":   "#4A8A5B",
  "Eğitim":       "#4A6B8A",
  "Din & İnanç":  "#8A7B4A",
  "Yalnızlık":    "#6B6B8A",
  "Hastalık":     "#7B4A6B",
  "Engellilik":   "#5B7B8A",
};

export function getCoverColor(category) {
  return CATEGORY_COLORS[category] ?? "#8B6B5A";
}

const CATEGORY_GRADIENTS = {
  "aşk":          "linear-gradient(160deg, #9d174d 0%, #db2777 55%, #f9a8d4 100%)",
  "aile":         "linear-gradient(160deg, #b45309 0%, #d97706 55%, #fcd34d 100%)",
  "kariyer":      "linear-gradient(160deg, #5b21b6 0%, #7c3aed 55%, #c4b5fd 100%)",
  "sağlık":       "linear-gradient(160deg, #065f46 0%, #059669 55%, #6ee7b7 100%)",
  "bağımlılık":   "linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #475569 100%)",
  "göç":          "linear-gradient(160deg, #134e4a 0%, #0d9488 55%, #5eead4 100%)",
  "kayıp":        "linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 55%, #93c5fd 100%)",
  "girişimcilik": "linear-gradient(160deg, #1e1b4b 0%, #3730a3 55%, #a5b4fc 100%)",
  "depresyon":    "linear-gradient(160deg, #1e293b 0%, #334155 55%, #94a3b8 100%)",
  "boşanma":      "linear-gradient(160deg, #881337 0%, #9f1239 45%, #64748b 100%)",
  "iflas":        "linear-gradient(160deg, #2e1065 0%, #4c1d95 55%, #7c3aed 100%)",
  "travma":       "linear-gradient(160deg, #450a0a 0%, #7f1d1d 45%, #64748b 100%)",
  "kimlik":       "linear-gradient(160deg, #164e63 0%, #0891b2 55%, #67e8f9 100%)",
  "anı":          "linear-gradient(160deg, #78350f 0%, #b45309 55%, #fde68a 100%)",
  "nesiller":     "linear-gradient(160deg, #14532d 0%, #16a34a 55%, #86efac 100%)",
  "emek":         "linear-gradient(160deg, #431407 0%, #92400e 55%, #d97706 100%)",
  "arkadaşlık":   "linear-gradient(160deg, #075985 0%, #0284c7 55%, #7dd3fc 100%)",
  "eğitim":       "linear-gradient(160deg, #1e3a8a 0%, #2563eb 55%, #bfdbfe 100%)",
  "din & inanç":  "linear-gradient(160deg, #713f12 0%, #a16207 55%, #fde68a 100%)",
  "yalnızlık":    "linear-gradient(160deg, #0c1445 0%, #1e3a5f 55%, #7ba7c4 100%)",
  "hastalık":     "linear-gradient(160deg, #4a044e 0%, #701a75 55%, #d946ef 100%)",
  "engellilik":   "linear-gradient(160deg, #1c4532 0%, #2d6a4f 55%, #74c69d 100%)",
};
const DEFAULT_GRADIENT = "linear-gradient(160deg, #c1440e 0%, #7d2608 100%)";

export function getCoverGradient(category) {
  return CATEGORY_GRADIENTS[(category || "").toLowerCase().trim()] ?? DEFAULT_GRADIENT;
}

export function calcReadTime(content) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} dk`;
}

export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getInitials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Jaccard benzerliği: iki kategori seti arasındaki eşleşme yüzdesi
export function calcMatchPercent(userCats, otherCats) {
  const a = new Set(userCats);
  const b = new Set(otherCats);
  const intersection = [...a].filter((c) => b.has(c)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? Math.round((intersection / union) * 100) : 0;
}

export function mapSupabaseStory(s) {
  return {
    id: s.id,
    userId: s.user_id,
    isAnonymous: s.is_anonymous,
    title: s.title,
    subtitle: s.subtitle || "",
    author: s.is_anonymous ? "Anonim" : s.author_name,
    authorAvatar: s.is_anonymous ? "?" : s.author_avatar,
    authorBio: "",
    coverColor: getCoverColor(s.category),
    category: s.category,
    readTime: calcReadTime(s.content),
    likes: s.likes || 0,
    commentCount: Number(s.story_comments?.[0]?.count ?? 0),
    weeklyReads: 0,
    date: formatDate(s.created_at),
    preview: s.content.slice(0, 250),
    chapters: 1,
    chaptersContent: [{ number: 1, title: s.title, content: s.content }],
    _isSupabase: true,
    _raw: s,
  };
}
