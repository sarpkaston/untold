import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import styles from "./Admin.module.css";

const ADMIN_EMAIL = "sarpkaston10@gmail.com";

export default function Admin() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stats");

  useEffect(() => {
    if (user !== null && user?.email !== ADMIN_EMAIL) navigate("/", { replace: true });
  }, [user]);

  if (!user || user.email !== ADMIN_EMAIL) return null;

  const tabs = [
    { id: "stats",   label: "İstatistikler", icon: "📊" },
    { id: "reports", label: "Şikayetler",    icon: "🚩" },
    { id: "users",   label: "Kullanıcılar",  icon: "👥" },
    { id: "stories", label: "Hikayeler",     icon: "📖" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate("/")}>←</button>
        <div>
          <h1 className={styles.title}>Admin Paneli</h1>
          <p className={styles.subtitle}>{user.email}</p>
        </div>
        <span className={styles.badge}>🛡️ Admin</span>
      </div>

      <div className={styles.tabBar}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === "stats"   && <StatsTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "users"   && <UsersTab />}
        {activeTab === "stories" && <StoriesTab />}
      </div>
    </div>
  );
}

/* ── İstatistikler ────────────────────────────────── */
function StatsTab() {
  const [stats, setStats] = useState(null);
  const [topCats, setTopCats] = useState([]);

  useEffect(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("stories").select("*", { count: "exact", head: true }).eq("published", true),
      supabase.from("stories").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      supabase.from("stories").select("user_id").gte("created_at", weekAgo).eq("published", true),
      supabase.from("story_reports").select("*", { count: "exact", head: true }),
      supabase.from("stories").select("category").eq("published", true),
    ]).then(([
      { count: users },
      { count: stories },
      { count: todayStories },
      { data: activeData },
      { count: reports },
      { data: catData },
    ]) => {
      const activeUsers = new Set((activeData || []).map(s => s.user_id)).size;
      setStats({ users, stories, todayStories, activeUsers, reports });

      const catMap = {};
      (catData || []).forEach(s => { catMap[s.category] = (catMap[s.category] || 0) + 1; });
      const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTopCats(sorted);
    });
  }, []);

  if (!stats) return <Spinner />;

  const statCards = [
    { label: "Toplam Kullanıcı", value: stats.users ?? "—", icon: "👤", color: "#3730a3" },
    { label: "Toplam Hikaye",    value: stats.stories ?? "—",    icon: "📖", color: "#065f46" },
    { label: "Bugün Hikaye",     value: stats.todayStories ?? 0, icon: "✍️",  color: "#c1440e" },
    { label: "Haftalık Aktif",   value: stats.activeUsers ?? 0,  icon: "🔥", color: "#b45309" },
    { label: "Toplam Şikayet",   value: stats.reports ?? 0,      icon: "🚩", color: "#dc2626" },
  ];

  return (
    <div className={styles.statsGrid}>
      {statCards.map(c => (
        <div key={c.label} className={styles.statCard} style={{ borderTop: `3px solid ${c.color}` }}>
          <span className={styles.statIcon}>{c.icon}</span>
          <span className={styles.statValue}>{c.value}</span>
          <span className={styles.statLabel}>{c.label}</span>
        </div>
      ))}

      {topCats.length > 0 && (
        <div className={styles.catSection}>
          <p className={styles.sectionTitle}>En Popüler Kategoriler</p>
          {topCats.map(([cat, count]) => (
            <div key={cat} className={styles.catRow}>
              <span className={styles.catName}>{cat}</span>
              <div className={styles.catBar}>
                <div
                  className={styles.catBarFill}
                  style={{ width: `${Math.round((count / (topCats[0][1] || 1)) * 100)}%` }}
                />
              </div>
              <span className={styles.catCount}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Şikayetler ──────────────────────────────────── */
function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [storyMap, setStoryMap] = useState({});
  const [reporterMap, setReporterMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    async function load() {
      // SECURITY DEFINER fonksiyonu — RLS'yi atlayarak tüm şikayetleri getirir
      const { data: reportData, error } = await supabase.rpc("get_admin_reports");

      if (error) {
        console.error("story_reports hatası:", error);
        setFetchError(`${error.message} — Supabase'de get_admin_reports fonksiyonunu oluşturdun mu?`);
        setLoading(false);
        return;
      }
      if (!reportData || reportData.length === 0) { setLoading(false); return; }
      setReports(reportData);

      const storyIds = [...new Set(reportData.map(r => r.story_id))];
      const userIds  = [...new Set(reportData.map(r => r.user_id).filter(Boolean))];

      const [{ data: storiesData }, { data: profilesData }] = await Promise.all([
        supabase.from("stories").select("id, title, author_name, is_anonymous").in("id", storyIds),
        userIds.length > 0
          ? supabase.from("profiles").select("id, full_name, username").in("id", userIds)
          : Promise.resolve({ data: [] }),
      ]);

      const sm = {}; (storiesData || []).forEach(s => { sm[s.id] = s; });
      const pm = {}; (profilesData || []).forEach(p => { pm[p.id] = p; });
      setStoryMap(sm);
      setReporterMap(pm);
      setLoading(false);
    }
    load();
  }, []);

  async function deleteReportedStory(storyId) {
    if (!window.confirm("Bu hikayeyi silmek istediğinden emin misin?")) return;
    setDeleting(storyId);
    await supabase.from("stories").delete().eq("id", storyId);
    setReports(prev => prev.filter(r => r.story_id !== storyId));
    setDeleting(null);
  }

  async function dismissReport(reportId) {
    await supabase.from("story_reports").delete().eq("id", reportId);
    setReports(prev => prev.filter(r => r.id !== reportId));
  }

  if (loading) return <Spinner />;
  if (fetchError) return <EmptyAdmin text={`Hata: ${fetchError}`} />;
  if (reports.length === 0) return <EmptyAdmin text="Bekleyen şikayet yok." />;

  const grouped = {};
  reports.forEach(r => {
    if (!grouped[r.story_id]) grouped[r.story_id] = { story: storyMap[r.story_id] || null, reports: [] };
    grouped[r.story_id].reports.push(r);
  });

  return (
    <div className={styles.list}>
      {Object.entries(grouped).map(([storyId, { story, reports: rs }]) => (
        <div key={storyId} className={`${styles.reportCard} ${rs.length >= 3 ? styles.reportCardHigh : ""}`}>
          <div className={styles.reportHeader}>
            <div>
              <p className={styles.reportStoryTitle}>
                {story?.is_anonymous ? "🔒 " : ""}{story?.title || "Hikaye silindi"}
              </p>
              <p className={styles.reportMeta}>{story?.author_name} · {rs.length} şikayet</p>
            </div>
            <span className={`${styles.reportCountBadge} ${rs.length >= 3 ? styles.badgeHigh : ""}`}>
              {rs.length}
            </span>
          </div>
          <div className={styles.reportReasons}>
            {rs.map(r => {
              const reporter = reporterMap[r.user_id];
              const reporterName = reporter
                ? (reporter.full_name || `@${reporter.username}` || "Bilinmeyen")
                : "Bilinmeyen";
              return (
                <div key={r.id} className={styles.reportReason}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className={styles.reasonTag}>{r.reason}</span>
                    <span className={styles.reporterName}> — {reporterName}</span>
                  </div>
                  <span className={styles.reportDate}>{fmtDate(r.created_at)}</span>
                  <button className={styles.dismissBtn} onClick={() => dismissReport(r.id)} title="Şikayeti kaldır">✕</button>
                </div>
              );
            })}
          </div>
          {story && (
            <button
              className={styles.deleteStoryBtn}
              onClick={() => deleteReportedStory(storyId)}
              disabled={deleting === storyId}
            >
              {deleting === storyId ? "Siliniyor…" : "🗑 Hikayeyi Sil"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Kullanıcılar ─────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: profiles }, { data: storyCounts }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, username, avatar_url, is_banned, updated_at").order("updated_at", { ascending: false }).limit(300),
        supabase.from("stories").select("user_id").eq("published", true),
      ]);

      const countMap = {};
      (storyCounts || []).forEach(s => { countMap[s.user_id] = (countMap[s.user_id] || 0) + 1; });

      setUsers((profiles || []).map(p => ({ ...p, storyCount: countMap[p.id] || 0 })));
      setLoading(false);
    }
    load();
  }, []);

  async function banUser(userId) {
    if (!window.confirm("Bu kullanıcıyı ban etmek istediğinden emin misin?")) return;
    await supabase.from("profiles").update({ is_banned: true }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: true } : u));
  }

  async function unbanUser(userId) {
    await supabase.from("profiles").update({ is_banned: false }).eq("id", userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: false } : u));
  }

  if (loading) return <Spinner />;

  const filtered = users.filter(u =>
    !search || (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        className={styles.searchInput}
        placeholder="İsim veya kullanıcı adı ara…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <p className={styles.listCount}>{filtered.length} kullanıcı</p>
      <div className={styles.list}>
        {filtered.map(u => (
          <div key={u.id} className={`${styles.userRow} ${u.is_banned ? styles.userBanned : ""}`}>
            <div className={styles.userAvatar}>
              {u.avatar_url
                ? <img src={u.avatar_url} className={styles.userAvatarImg} alt="" />
                : <span>{initials(u.full_name)}</span>
              }
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{u.full_name || "—"} {u.is_banned && <span className={styles.bannedTag}>Banlı</span>}</p>
              <p className={styles.userMeta}>@{u.username || "?"} · {u.storyCount} hikaye</p>
              <p className={styles.userMeta}>{u.updated_at ? fmtDate(u.updated_at) : "—"}</p>
            </div>
            <div className={styles.userActions}>
              {u.is_banned ? (
                <button className={styles.unbanBtn} onClick={() => unbanUser(u.id)}>Ban Kaldır</button>
              ) : (
                <button className={styles.banBtn} onClick={() => banUser(u.id)}>Ban Et</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Hikayeler ───────────────────────────────────── */
function StoriesTab() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date"); // date | reports | likes
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    async function load() {
      const [{ data: storiesData }, { data: reportsData }] = await Promise.all([
        supabase.from("stories").select("id, title, author_name, category, is_anonymous, created_at, likes, published, user_id").order("created_at", { ascending: false }).limit(300),
        supabase.from("story_reports").select("story_id"),
      ]);

      const reportMap = {};
      (reportsData || []).forEach(r => { reportMap[r.story_id] = (reportMap[r.story_id] || 0) + 1; });

      setStories((storiesData || []).map(s => ({ ...s, reportCount: reportMap[s.id] || 0 })));
      setLoading(false);
    }
    load();
  }, []);

  async function deleteStory(id) {
    if (!window.confirm("Bu hikayeyi silmek istediğinden emin misin?")) return;
    setDeleting(id);
    await supabase.from("stories").delete().eq("id", id);
    setStories(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
  }

  if (loading) return <Spinner />;

  let filtered = stories.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.author_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (sortBy === "reports") filtered = [...filtered].sort((a, b) => b.reportCount - a.reportCount);
  else if (sortBy === "likes") filtered = [...filtered].sort((a, b) => (b.likes || 0) - (a.likes || 0));

  return (
    <div>
      <div className={styles.storiesControls}>
        <input
          className={styles.searchInput}
          placeholder="Başlık veya yazar ara…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date">En Yeni</option>
          <option value="reports">En Çok Şikayet</option>
          <option value="likes">En Çok Beğeni</option>
        </select>
      </div>
      <p className={styles.listCount}>{filtered.length} hikaye</p>
      <div className={styles.list}>
        {filtered.map(s => (
          <div key={s.id} className={`${styles.storyRow} ${s.reportCount > 0 ? styles.storyFlagged : ""}`}>
            <div className={styles.storyInfo}>
              <p className={styles.storyTitle}>
                {s.is_anonymous ? "🔒 " : ""}{s.title}
                {!s.published && <span className={styles.draftTag}> taslak</span>}
              </p>
              <p className={styles.storyMeta}>{s.author_name} · {s.category} · {fmtDate(s.created_at)}</p>
              <div className={styles.storyBadges}>
                <span className={styles.badge}>❤ {s.likes || 0}</span>
                {s.reportCount > 0 && <span className={`${styles.badge} ${styles.badgeRed}`}>🚩 {s.reportCount}</span>}
              </div>
            </div>
            <button
              className={styles.deleteBtn}
              onClick={() => deleteStory(s.id)}
              disabled={deleting === s.id}
            >
              {deleting === s.id ? "…" : "🗑"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────── */
function Spinner() {
  return (
    <div className={styles.spinner}>
      {[0,1,2].map(i => <span key={i} className={styles.dot} style={{ animationDelay: `${i * 0.2}s` }} />)}
    </div>
  );
}

function EmptyAdmin({ text }) {
  return <p className={styles.emptyText}>{text}</p>;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
