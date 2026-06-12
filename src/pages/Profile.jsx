import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { getInitials, mapSupabaseStory, getCoverColor, formatDate } from "../lib/storyUtils";
import styles from "./Profile.module.css";

function getMinDateTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d.toISOString().slice(0, 16);
}

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "raf";
  function setActiveTab(tab) { setSearchParams({ tab }, { replace: true }); }
  const { shelfIds, user } = useApp();
  const [myStories, setMyStories] = useState([]);
  const [shelfStories, setShelfStories] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Bağlantılar
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [anonConnections, setAnonConnections] = useState([]);
  const [connAvatarMap, setConnAvatarMap] = useState({});

  // Live modals
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveTitle, setLiveTitle] = useState("");
  const [startingLive, setStartingLive] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planningLive, setPlanningLive] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planDone, setPlanDone] = useState(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Kullanıcı";
  const usernameSlug = "@" + (user?.email?.split("@")[0] || "kullanici").toLowerCase();
  const bio = user?.user_metadata?.bio || "";
  const initials = getInitials(displayName);

  // Load avatar
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url, bio, username").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.avatar_url) {
          const base = data.avatar_url.split("?")[0];
          setAvatarUrl(base + "?t=" + Date.now());
        }
      });
  }, [user]);

  // Load my stories
  useEffect(() => {
    if (!user) return;
    supabase
      .from("stories")
      .select("id, title, category, is_anonymous, likes, created_at")
      .eq("user_id", user.id)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMyStories(data || []));
  }, [user]);

  // Load shelf stories
  useEffect(() => {
    if (!user) { setShelfStories([]); return; }
    (async () => {
      const { data: saves } = await supabase.from("story_saves").select("story_id").eq("user_id", user.id);
      if (!saves?.length) { setShelfStories([]); return; }
      const ids = saves.map((r) => r.story_id);
      const { data } = await supabase.from("stories").select("*").in("id", ids);
      setShelfStories((data || []).map(mapSupabaseStory));
    })();
  }, [user, shelfIds]);

  // Fetch connections
  useEffect(() => {
    if (!user || connections.length > 0) return;
    setConnectionsLoading(true);

    async function fetchConnections() {
      const { data: myStoriesData } = await supabase
        .from("stories").select("category, is_anonymous").eq("user_id", user.id).eq("published", true);

      const myNonAnonCats = new Set();
      const myAnonCats = new Set();
      (myStoriesData || []).forEach((s) => {
        const cat = s.category.toLowerCase();
        if (s.is_anonymous) myAnonCats.add(cat);
        else myNonAnonCats.add(cat);
      });
      const myAnonOnlyCats = new Set([...myAnonCats].filter(c => !myNonAnonCats.has(c)));
      const myCats = new Set([...myNonAnonCats, ...myAnonCats]);

      if (myCats.size === 0) { setConnectionsLoading(false); return; }

      const { data: otherStories } = await supabase
        .from("stories")
        .select("user_id, author_name, category, id, title, is_anonymous")
        .eq("published", true)
        .neq("user_id", user.id);

      const userMap = {};
      (otherStories || []).forEach((s) => {
        const cat = s.category.toLowerCase();
        if (!myCats.has(cat)) return;
        if (!userMap[s.user_id]) {
          userMap[s.user_id] = {
            user_id: s.user_id, realName: null,
            nonAnonMatchCats: new Set(), anonMatchCats: new Set(),
            viaMyNonAnon: false, viaMyAnonOnly: false, stories: {},
          };
        }
        if (myNonAnonCats.has(cat)) userMap[s.user_id].viaMyNonAnon = true;
        if (myAnonOnlyCats.has(cat)) userMap[s.user_id].viaMyAnonOnly = true;
        if (s.is_anonymous) {
          userMap[s.user_id].anonMatchCats.add(cat);
        } else {
          userMap[s.user_id].nonAnonMatchCats.add(cat);
          if (!userMap[s.user_id].realName) userMap[s.user_id].realName = s.author_name;
          if (!userMap[s.user_id].stories[cat]) userMap[s.user_id].stories[cat] = { id: s.id, title: s.title };
        }
      });

      const regularMatches = [];
      const anonFromMyAnonMatches = [];

      Object.values(userMap).forEach((u) => {
        const theyAreAnon = u.nonAnonMatchCats.size === 0;
        if (u.viaMyNonAnon) {
          const cats = [...new Set([...u.nonAnonMatchCats, ...u.anonMatchCats])].filter(c => myNonAnonCats.has(c));
          regularMatches.push({ user_id: u.user_id, author_name: theyAreAnon ? "Anonim" : u.realName, commonCats: cats, stories: theyAreAnon ? {} : u.stories, isAnonymous: theyAreAnon });
        } else if (u.viaMyAnonOnly) {
          const cats = [...new Set([...u.nonAnonMatchCats, ...u.anonMatchCats])].filter(c => myAnonOnlyCats.has(c));
          anonFromMyAnonMatches.push({ user_id: u.user_id, author_name: theyAreAnon ? "Anonim" : u.realName, commonCats: cats, stories: theyAreAnon ? {} : u.stories, isAnonymous: theyAreAnon });
        }
      });

      const reg = regularMatches.sort((a, b) => b.commonCats.length - a.commonCats.length).slice(0, 25);
      setConnections(reg);
      setAnonConnections(anonFromMyAnonMatches);

      // Batch-fetch profile avatars for visible connections
      const visibleIds = [...reg, ...anonFromMyAnonMatches].filter(c => !c.isAnonymous).map(c => c.user_id);
      if (visibleIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, avatar_url").in("id", visibleIds);
        const map = {};
        (profiles || []).forEach(p => { if (p.avatar_url) map[p.id] = p.avatar_url; });
        setConnAvatarMap(map);
      }

      setConnectionsLoading(false);
    }

    fetchConnections();
  }, [user]);

  async function deleteStory(id) {
    await supabase.from("stories").delete().eq("id", id);
    setMyStories((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  }

  async function startLiveStream() {
    if (!liveTitle.trim() || !user) return;
    setStartingLive(true); setLiveError("");
    const roomName = `live-${user.id.slice(0, 8)}-${Date.now()}`;
    const { error } = await supabase.from("live_sessions").insert({
      host_id: user.id, host_name: displayName, host_avatar: initials,
      room_name: roomName, title: liveTitle.trim(),
    });
    setStartingLive(false);
    if (error) { setLiveError("Başlatılamadı: " + error.message); }
    else { setShowLiveModal(false); setLiveTitle(""); navigate(`/canli/${roomName}`); }
  }

  async function scheduleLiveStream() {
    if (!planTitle.trim() || !planDate || !user) return;
    setPlanningLive(true); setPlanError("");
    const roomName = `plan-${user.id.slice(0, 8)}-${Date.now()}`;
    const { error } = await supabase.from("live_sessions").insert({
      host_id: user.id, host_name: displayName, host_avatar: initials,
      room_name: roomName, title: planTitle.trim(), description: planDesc.trim(),
      is_active: false, is_scheduled: true, scheduled_at: new Date(planDate).toISOString(),
    });
    setPlanningLive(false);
    if (error) { setPlanError("Planlanamadı: " + error.message); }
    else {
      setPlanDone(true);
      setTimeout(() => { setShowPlanModal(false); setPlanTitle(""); setPlanDesc(""); setPlanDate(""); setPlanDone(false); }, 2200);
    }
  }

  return (
    <div className={styles.page}>

      {/* ── HERO ─────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroTopBar}>
          <button className={styles.heroIconBtn} onClick={() => navigate("/mesajlar")}>
            <MessagesBubbleIcon />
          </button>
          <button className={styles.heroIconBtn} onClick={() => navigate("/ayarlar")}>
            <SettingsIcon />
          </button>
        </div>

        <div className={styles.heroAvatarWrap} onClick={() => navigate("/ayarlar")}>
          {avatarUrl ? (
            <img src={avatarUrl} className={styles.heroAvatarImg} alt={displayName} />
          ) : (
            <div className={styles.heroAvatar}>{initials}</div>
          )}
          <div className={styles.cameraOverlay}><CameraIcon /></div>
        </div>

        <h1 className={styles.heroName}>{displayName}</h1>
        <p className={styles.heroUsername}>{usernameSlug}</p>
        {bio && <p className={styles.heroBio}>{bio}</p>}

        <div className={styles.heroActions}>
          <button className={styles.heroActionBtn} onClick={() => { setShowLiveModal(true); setLiveError(""); }}>
            <span className={styles.liveDotSmall} />
            Canlı Yayın
          </button>
          <button className={styles.heroActionBtn} onClick={() => { setShowPlanModal(true); setPlanError(""); setPlanDone(false); }}>
            <CalendarIcon />
            Planla
          </button>
        </div>
      </div>

      {/* ── STATS CARD ───────────────────────────── */}
      <div className={styles.statsCard}>
        <div className={styles.statItem}>
          <span className={styles.statNum}>{shelfIds.length}</span>
          <span className={styles.statLabel}>Rafımda</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNum}>{myStories.length}</span>
          <span className={styles.statLabel}>Hikaye</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statNum}>{connections.length + anonConnections.length}</span>
          <span className={styles.statLabel}>Bağlantı</span>
        </div>
      </div>

      {/* ── TAB PILLS ────────────────────────────── */}
      <div className={styles.tabRow}>
        <div className={styles.tabPills}>
          {["raf", "hikaye", "baglantilar"].map((tab) => (
            <button
              key={tab}
              className={`${styles.pill} ${activeTab === tab ? styles.pillActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "raf" ? "Rafım" : tab === "hikaye" ? "Hikayem" : "Bağlantılar"}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ──────────────────────────── */}
      <div className={styles.tabContent}>

        {/* ── Rafım (değiştirilmedi) ── */}
        {activeTab === "raf" && (
          shelfStories.length === 0 ? (
            <EmptyState emoji="📚" title="Rafın henüz boş" desc='"Rafıma Al" butonuyla hikaye ekle.' />
          ) : (
            <div className={styles.bookGrid}>
              {shelfStories.map((s) => (
                <Link to={`/hikaye/${s.id}`} key={s.id} className={styles.bookItem}>
                  <div className={styles.bookCover} style={{ background: s.coverColor }}>
                    <div className={styles.bookSpine} />
                    <div className={styles.bookLines} />
                    <div className={styles.bookCoverText}>
                      <span className={styles.bookCat}>{s.category}</span>
                      <p className={styles.bookTitle}>{s.title}</p>
                    </div>
                  </div>
                  <p className={styles.bookAuthor}>{s.author || s.author_name}</p>
                </Link>
              ))}
            </div>
          )
        )}

        {/* ── Hikayem ── */}
        {activeTab === "hikaye" && (
          <div className={styles.storiesTab}>
            {myStories.length === 0 ? (
              <EmptyState emoji="✍️" title="Henüz hikayeniz yok" desc="İlk hikayeni yaz ve topluluğa katıl!" />
            ) : (
              myStories.map((s) => (
                <div key={s.id} className={styles.storyRow}>
                  {confirmDeleteId === s.id ? (
                    <div className={styles.deleteConfirm}>
                      <p className={styles.deleteConfirmText}>Bu hikayeyi silmek istediğinden emin misin?</p>
                      <div className={styles.deleteConfirmActions}>
                        <button className={styles.cancelDeleteBtn} onClick={() => setConfirmDeleteId(null)}>İptal</button>
                        <button className={styles.confirmDeleteBtn} onClick={() => deleteStory(s.id)}>Evet, Sil</button>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/hikaye/${s.id}`} className={styles.storyCard}>
                      <div className={styles.storyCatLine} style={{ background: getCoverColor(s.category) }} />
                      <div className={styles.storyCardBody}>
                        <div className={styles.storyCardTop}>
                          <p className={styles.storyCardTitle}>
                            {s.is_anonymous && <span className={styles.lockIcon}>🔒 </span>}
                            {s.title}
                          </p>
                          <button
                            className={styles.deleteBtn}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(s.id); }}
                            title="Sil"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        <p className={styles.storyCardMeta}>{formatDate(s.created_at)} · {s.category}</p>
                        <p className={styles.storyCardStats}>❤ {s.likes || 0}</p>
                      </div>
                    </Link>
                  )}
                </div>
              ))
            )}
            <Link to="/yaz" className={styles.newStoryBtn}>+ Yeni Hikaye Yaz</Link>
          </div>
        )}

        {/* ── Bağlantılar ── */}
        {activeTab === "baglantilar" && (
          <div className={styles.connectionsTab}>
            {connectionsLoading ? (
              <div className={styles.connLoading}>
                {[0,1,2].map((i) => <span key={i} className={styles.connDot} style={{ animationDelay: `${i*0.2}s` }} />)}
              </div>
            ) : (
              <>
                {connections.length === 0 && anonConnections.length === 0 && (
                  <EmptyState emoji="🤝" title="Henüz eşleşme yok" desc="Hikaye yaz, aynı kategoriyi kullanan yazarlarla eşleş!" />
                )}

                {connections.length > 0 && (
                  <>
                    {anonConnections.length > 0 && <p className={styles.connSectionLabel}>EŞLEŞMELER</p>}
                    {connections.map((c) => (
                      <ConnCard
                        key={c.user_id}
                        item={c}
                        avatarUrl={connAvatarMap[c.user_id]}
                        onNavigate={(path) => navigate(path)}
                      />
                    ))}
                  </>
                )}

                {anonConnections.length > 0 && (
                  <>
                    <p className={styles.connSectionLabel}>ANONİM HİKAYENDEN EŞLEŞENLER</p>
                    <p className={styles.anonNote}>Sen onları görebilirsin ama onlar seni göremez</p>
                    {anonConnections.map((a) => (
                      <ConnCard
                        key={a.user_id}
                        item={a}
                        avatarUrl={connAvatarMap[a.user_id]}
                        onNavigate={(path) => navigate(path)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────── */}
      {showLiveModal && (
        <div className={styles.overlay} onClick={() => setShowLiveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Canlı Yayın Başlat</h3>
            <p className={styles.modalDesc}>Yayın başlığını gir.</p>
            <input className={styles.modalInput} placeholder="Örn: Hikayemi anlatıyorum…" value={liveTitle} onChange={(e) => setLiveTitle(e.target.value)} maxLength={80} autoFocus onKeyDown={(e) => e.key === "Enter" && startLiveStream()} />
            {liveError && <p className={styles.modalError}>{liveError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowLiveModal(false)}>İptal</button>
              <button className={styles.modalStart} onClick={startLiveStream} disabled={!liveTitle.trim() || startingLive}>{startingLive ? "Başlatılıyor…" : "🔴 Yayın Başlat"}</button>
            </div>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className={styles.overlay} onClick={() => !planDone && setShowPlanModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {planDone ? (
              <div className={styles.planSuccess}><span>📅</span><p>Yayın planlandı! "Yakında" bölümünde görünüyor.</p></div>
            ) : (
              <>
                <h3 className={styles.modalTitle}>Yayın Planla</h3>
                <p className={styles.modalDesc}>Tarihi ve saati seç.</p>
                <input className={styles.modalInput} placeholder="Yayın başlığı…" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} maxLength={80} autoFocus />
                <textarea className={`${styles.modalInput} ${styles.modalTextarea}`} placeholder="Açıklama (isteğe bağlı)" value={planDesc} onChange={(e) => setPlanDesc(e.target.value)} maxLength={200} rows={3} />
                <div className={styles.modalDateLabel}>Tarih ve Saat</div>
                <input type="datetime-local" className={styles.modalInput} value={planDate} min={getMinDateTime()} onChange={(e) => setPlanDate(e.target.value)} />
                {planDate && <p className={styles.planDateNote}>{new Date(planDate).toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>}
                {planError && <p className={styles.modalError}>{planError}</p>}
                <div className={styles.modalActions}>
                  <button className={styles.modalCancel} onClick={() => setShowPlanModal(false)}>İptal</button>
                  <button className={styles.modalStart} onClick={scheduleLiveStream} disabled={!planTitle.trim() || !planDate || planningLive}>{planningLive ? "Planlanıyor…" : "📅 Planla"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Connection card component ────────────── */
function ConnCard({ item, avatarUrl, onNavigate }) {
  const clickable = !item.isAnonymous;
  const msgUrl = `/mesajlar/${item.user_id}${item.isAnonymous ? "?anon=1" : ""}`;

  return (
    <div className={styles.connCard}>
      <div
        className={`${styles.connAvatar} ${item.isAnonymous ? styles.connAvatarAnon : ""}`}
        onClick={clickable ? () => onNavigate(`/kullanici/${item.user_id}`) : undefined}
        style={{ cursor: clickable ? "pointer" : "default" }}
      >
        {!item.isAnonymous && avatarUrl ? (
          <img src={avatarUrl} className={styles.connAvatarImg} alt={item.author_name} />
        ) : (
          item.isAnonymous ? "?" : getInitials(item.author_name)
        )}
      </div>
      <div className={styles.connBody}>
        <p
          className={styles.connName}
          onClick={clickable ? () => onNavigate(`/kullanici/${item.user_id}`) : undefined}
          style={{ cursor: clickable ? "pointer" : "default" }}
        >
          {item.author_name}
        </p>
        <div className={styles.connCats}>
          {item.commonCats.slice(0, 3).map((cat) => (
            <div key={cat} className={styles.connCatGroup}>
              <span className={styles.connCatBadge}>{cat}</span>
              {!item.isAnonymous && item.stories[cat] && (
                <Link to={`/hikaye/${item.stories[cat].id}`} className={styles.connStoryTitle}>
                  {item.stories[cat].title}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
      <button className={styles.connMsgBtn} onClick={() => onNavigate(msgUrl)} title="Mesaj at">
        <ChatIcon />
      </button>
    </div>
  );
}

function EmptyState({ emoji, title, desc }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyEmoji}>{emoji}</span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyDesc}>{desc}</p>
    </div>
  );
}

/* ── Icons ─────────────────────────────────── */
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}
function MessagesBubbleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
