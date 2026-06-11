import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory, getCoverColor, getInitials } from "../lib/storyUtils";
import { useApp } from "../context/AppContext";
import styles from "./Matches.module.css";

const REMINDERS_KEY = "untold_reminders";

function getReminders() {
  try { return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]"); } catch { return []; }
}
function saveReminders(list) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
}
function isReminded(id) {
  return getReminders().some((r) => r.id === id);
}
function toggleReminder(id, title, scheduledAt) {
  const list = getReminders();
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push({ id, title, scheduledAt });
    // Tarayıcı bildirimi planla (sayfa açıkken)
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000 && "Notification" in window) {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          setTimeout(() => new Notification("Untold — Yakında", { body: title, icon: "/favicon.ico" }), delay);
        }
      });
    }
  }
  saveReminders(list);
  return idx < 0; // true = artık reminded
}

function formatScheduled(iso) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return { date: "Bugün", time };
  if (isTomorrow) return { date: "Yarın", time };
  return { date: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }), time };
}

export default function Matches() {
  const { user } = useApp();
  const [liveSessions, setLiveSessions] = useState([]);
  const [scheduledItems, setScheduledItems] = useState([]);
  const [userMatches, setUserMatches] = useState([]);
  const [trendingStories, setTrendingStories] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [reminderMap, setReminderMap] = useState(() => {
    const obj = {};
    getReminders().forEach((r) => (obj[r.id] = true));
    return obj;
  });

  // ── Canlı yayınlar (15s yenile) ─────────────────────────────────
  useEffect(() => {
    const fetchLive = () =>
      supabase.from("live_sessions").select("*").eq("is_active", true)
        .order("started_at", { ascending: false })
        .then(({ data }) => setLiveSessions(data || []));

    fetchLive();
    const interval = setInterval(fetchLive, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Yakında: planlanmış yayınlar + hikayeler ────────────────────
  useEffect(() => {
    async function fetchScheduled() {
      const now = new Date().toISOString();

      const [{ data: liveData }, { data: storyData }] = await Promise.all([
        supabase.from("live_sessions")
          .select("id, host_name, host_avatar, title, description, scheduled_at, room_name, host_id, is_scheduled")
          .eq("is_active", false)
          .eq("is_scheduled", true)
          .not("scheduled_at", "is", null)
          .gte("scheduled_at", now)
          .order("scheduled_at", { ascending: true })
          .limit(6),
        supabase.from("stories")
          .select("id, author_name, author_avatar, title, category, scheduled_at, is_scheduled")
          .eq("published", false)
          .eq("is_scheduled", true)
          .not("scheduled_at", "is", null)
          .gte("scheduled_at", now)
          .order("scheduled_at", { ascending: true })
          .limit(4),
      ]);

      const lives = (liveData || []).map((s) => ({ ...s, _type: "live" }));
      const stories = (storyData || []).map((s) => ({ ...s, _type: "story" }));
      const merged = [...lives, ...stories].sort(
        (a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)
      );
      setScheduledItems(merged);
    }
    fetchScheduled();
  }, []);

  // ── Eşleşme algoritması ──────────────────────────────────────────
  useEffect(() => {
    async function fetchMatches() {
      setMatchesLoading(true);
      if (!user) { setMatchesLoading(false); return; }

      // Kullanıcının kendi hikaye kategorileri
      const { data: myStories } = await supabase
        .from("stories")
        .select("category")
        .eq("user_id", user.id)
        .eq("published", true);

      const myCats = new Set((myStories || []).map((s) => s.category.toLowerCase()));

      if (myCats.size === 0) { setMatchesLoading(false); return; }

      // Diğer kullanıcıların anonim olmayan hikayeleri
      const { data: otherStories } = await supabase
        .from("stories")
        .select("user_id, author_name, author_avatar, category")
        .eq("published", true)
        .eq("is_anonymous", false)
        .neq("user_id", user.id);

      // Kullanıcı başına kategorileri topla
      const userMap = {};
      (otherStories || []).forEach((s) => {
        if (!userMap[s.user_id]) {
          userMap[s.user_id] = {
            user_id: s.user_id,
            author_name: s.author_name,
            author_avatar: s.author_avatar,
            categories: new Set(),
          };
        }
        userMap[s.user_id].categories.add(s.category.toLowerCase());
      });

      // Jaccard benzerliği hesapla
      const matches = Object.values(userMap).map((u) => {
        const intersection = [...u.categories].filter((c) => myCats.has(c)).length;
        const union = new Set([...u.categories, ...myCats]).size;
        const matchPercent = union > 0 ? Math.round((intersection / union) * 100) : 0;
        return {
          ...u,
          categories: [...u.categories],
          matchPercent,
        };
      });

      setUserMatches(
        matches
          .filter((u) => u.matchPercent > 0)
          .sort((a, b) => b.matchPercent - a.matchPercent)
          .slice(0, 6)
      );
      setMatchesLoading(false);
    }
    fetchMatches();
  }, [user]);

  // ── Gündem algoritması (son 7 gün) ──────────────────────────────
  useEffect(() => {
    async function fetchTrending() {
      setTrendingLoading(true);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: likes }, { data: saves }, { data: comments }] = await Promise.all([
        supabase.from("story_likes").select("story_id").gte("created_at", sevenDaysAgo),
        supabase.from("story_saves").select("story_id").gte("created_at", sevenDaysAgo),
        supabase.from("story_comments").select("story_id").gte("created_at", sevenDaysAgo),
      ]);

      // Puan hesapla: beğeni×2, rafıma al×3, yorum×1
      const scores = {};
      (likes || []).forEach((r) => { scores[r.story_id] = (scores[r.story_id] || 0) + 2; });
      (saves || []).forEach((r) => { scores[r.story_id] = (scores[r.story_id] || 0) + 3; });
      (comments || []).forEach((r) => { scores[r.story_id] = (scores[r.story_id] || 0) + 1; });

      const topIds = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      if (topIds.length === 0) {
        // Etkileşim yoksa genel popülerlik sıralaması
        const { data } = await supabase
          .from("stories").select("*").eq("published", true)
          .order("likes", { ascending: false }).limit(5);
        setTrendingStories((data || []).map((s) => ({ ...mapSupabaseStory(s), score: s.likes })));
        setTrendingLoading(false);
        return;
      }

      const { data: storyData } = await supabase
        .from("stories").select("*").in("id", topIds);

      setTrendingStories(
        (storyData || [])
          .map((s) => ({ ...mapSupabaseStory(s), score: scores[s.id] || 0 }))
          .sort((a, b) => b.score - a.score)
      );
      setTrendingLoading(false);
    }
    fetchTrending();
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Bağlan</h1>
        <p className={styles.pageSubtitle}>Yazarlarla buluş, canlı oturumlara katıl</p>
      </div>

      {/* ── Şu An Canlı ─────────────────────── */}
      <Section icon={<LiveDot />} title="Şu An Canlı" accent>
        <div className={styles.liveList}>
          {liveSessions.length === 0 ? (
            <p className={styles.noLive}>Şu an aktif yayın yok.</p>
          ) : (
            liveSessions.map((s) => <RealLiveCard key={s.id} session={s} />)
          )}
        </div>
      </Section>

      {/* ── Seninle Eşleşenler ──────────────── */}
      <Section icon={<MatchIcon />} title="Seninle Eşleşenler">
        {!user ? (
          <p className={styles.noLive}>Eşleşmeleri görmek için giriş yap.</p>
        ) : matchesLoading ? (
          <LoadingDots />
        ) : userMatches.length === 0 ? (
          <p className={styles.noLive}>Henüz eşleşen yazar bulunamadı. Hikaye yaz!</p>
        ) : (
          <div className={styles.matchScroll}>
            {userMatches.map((u) => (
              <MatchCard key={u.user_id} match={u} />
            ))}
          </div>
        )}
      </Section>

      {/* ── Yakında ─────────────────────────── */}
      <Section icon={<CalIcon />} title="Yakında">
        <div className={styles.scheduleList}>
          {scheduledItems.length === 0 ? (
            <p className={styles.noLive}>Planlanmış etkinlik yok.</p>
          ) : (
            scheduledItems.map((item) =>
              item._type === "live" ? (
                <ScheduledLiveCard
                  key={item.id}
                  item={item}
                  reminded={!!reminderMap[item.id]}
                  currentUserId={user?.id}
                  onToggleReminder={() => {
                    const nowOn = toggleReminder(item.id, item.title, item.scheduled_at);
                    setReminderMap((m) => ({ ...m, [item.id]: nowOn }));
                  }}
                />
              ) : (
                <ScheduledStoryCard
                  key={item.id}
                  item={item}
                  reminded={!!reminderMap[item.id]}
                  onToggleReminder={() => {
                    const nowOn = toggleReminder(item.id, item.title, item.scheduled_at);
                    setReminderMap((m) => ({ ...m, [item.id]: nowOn }));
                  }}
                />
              )
            )
          )}
        </div>
      </Section>

      {/* ── Bu Hafta Gündemde ───────────────── */}
      <Section icon={<FireIcon />} title="Bu Hafta Gündemde">
        {trendingLoading ? (
          <LoadingDots />
        ) : trendingStories.length === 0 ? (
          <p className={styles.noLive}>Henüz yeterli etkileşim yok.</p>
        ) : (
          <div className={styles.trendList}>
            {trendingStories.map((s, i) => (
              <Link to={`/hikaye/${s.id}`} key={s.id} className={styles.trendRow}>
                <span className={`${styles.trendRank} ${i < 3 ? styles.trendRankTop : ""}`}>
                  {i + 1}
                </span>
                <div className={styles.trendCover} style={{ background: s.coverColor }} />
                <div className={styles.trendBody}>
                  <p className={styles.trendTitle}>{s.title}</p>
                  <p className={styles.trendMeta}>{s.author} · {s.category}</p>
                </div>
                <div className={styles.trendStat}>
                  <FireIconSmall />
                  <span>{s.score}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ── Section wrapper ─────────────────────────── */
function Section({ icon, title, accent, children }) {
  return (
    <div className={`${styles.section} ${accent ? styles.sectionAccent : ""}`}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ── Kullanıcı eşleşme kartı ─────────────────── */
function MatchCard({ match }) {
  const initials = getInitials(match.author_name);
  const pct = match.matchPercent;
  const barColor = pct >= 70 ? "#27ae60" : pct >= 40 ? "#e67e22" : "var(--terracotta)";

  return (
    <div className={styles.matchCard}>
      <div className={styles.matchAvatar}>{initials}</div>
      <p className={styles.matchName}>{match.author_name}</p>
      <div className={styles.matchBar}>
        <div className={styles.matchBarFill} style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <p className={styles.matchPct} style={{ color: barColor }}>{pct}% eşleşme</p>
      <p className={styles.matchCats}>{match.categories.slice(0, 2).join(", ")}</p>
    </div>
  );
}

/* ── Real LiveKit live card ──────────────────── */
function RealLiveCard({ session }) {
  const navigate = useNavigate();

  return (
    <div className={styles.liveCard}>
      <div className={styles.liveCover} style={{ background: "#c96a3a" }}>
        <span className={styles.liveSpine} />
        <span className={styles.liveOnAir}>CANLI</span>
      </div>
      <div className={styles.liveBody}>
        <div className={styles.liveAuthorRow}>
          <span className={styles.liveAvatar}>{session.host_avatar}</span>
          <div>
            <p className={styles.liveAuthor}>{session.host_name}</p>
            <p className={styles.liveBook}>{session.title}</p>
          </div>
        </div>
        <div className={styles.liveFooter}>
          <span className={styles.liveViewers}>
            <EyeIcon /> {session.viewer_count || 0} izleyici
          </span>
          <button
            className={styles.joinBtn}
            onClick={() => navigate(`/canli/${session.room_name}`)}
          >
            Katıl →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Planlanmış canlı yayın kartı ───────────── */
function ScheduledLiveCard({ item, reminded, currentUserId, onToggleReminder }) {
  const navigate = useNavigate();
  const { date, time } = formatScheduled(item.scheduled_at);
  const isHost = currentUserId && currentUserId === item.host_id;

  async function goLive() {
    await supabase.from("live_sessions")
      .update({ is_active: true, started_at: new Date().toISOString() })
      .eq("id", item.id);
    navigate(`/canli/${item.room_name}`);
  }

  return (
    <div className={styles.schedCard}>
      <div className={styles.schedDateTime}>
        <span className={styles.schedDate}>{date}</span>
        <span className={styles.schedTime}>{time}</span>
      </div>
      <div className={styles.schedCover} style={{ background: "#c96a3a" }}>
        <span className={styles.schedSpine} />
        <span className={styles.schedBadge}>CANLI</span>
      </div>
      <div className={styles.schedBody}>
        <div className={styles.schedAuthorRow}>
          <span className={styles.schedAvatar}>{item.host_avatar}</span>
          <div>
            <p className={styles.schedAuthor}>{item.host_name}</p>
            {item.description && <p className={styles.schedBook}>{item.description}</p>}
          </div>
        </div>
        <p className={styles.schedTopic}>{item.title}</p>
        {isHost && (
          <button className={styles.goLiveBtn} onClick={goLive}>
            🔴 Yayını Başlat
          </button>
        )}
      </div>
      <button
        className={`${styles.remindBtn} ${reminded ? styles.remindBtnActive : ""}`}
        onClick={onToggleReminder}
        aria-label="Hatırlatıcı"
      >
        <BellIcon filled={reminded} />
      </button>
    </div>
  );
}

/* ── Planlanmış hikaye kartı ─────────────────── */
function ScheduledStoryCard({ item, reminded, onToggleReminder }) {
  const { date, time } = formatScheduled(item.scheduled_at);
  const color = getCoverColor(item.category);

  return (
    <div className={styles.schedCard}>
      <div className={styles.schedDateTime}>
        <span className={styles.schedDate}>{date}</span>
        <span className={styles.schedTime}>{time}</span>
      </div>
      <div className={styles.schedCover} style={{ background: color }}>
        <span className={styles.schedSpine} />
        <span className={styles.schedBadgeStory}>📖</span>
      </div>
      <div className={styles.schedBody}>
        <div className={styles.schedAuthorRow}>
          <span className={styles.schedAvatar}>{item.author_avatar}</span>
          <div>
            <p className={styles.schedAuthor}>{item.author_name}</p>
            <p className={styles.schedBook}>{item.category}</p>
          </div>
        </div>
        <p className={styles.schedTopic}>{item.title}</p>
        <p className={styles.schedStoryNote}>📖 Yeni Hikaye</p>
      </div>
      <button
        className={`${styles.remindBtn} ${reminded ? styles.remindBtnActive : ""}`}
        onClick={onToggleReminder}
        aria-label="Hatırlatıcı"
      >
        <BellIcon filled={reminded} />
      </button>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: 6, padding: "12px 4px" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--terracotta)", opacity: 0.4,
          animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── Icons ───────────────────────────────────── */
function LiveDot() { return <span className={styles.liveDot} />; }

function MatchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
    </svg>
  );
}

function FireIconSmall() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BellIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
