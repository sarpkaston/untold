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
