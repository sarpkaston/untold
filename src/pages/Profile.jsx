import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { getInitials, mapSupabaseStory } from "../lib/storyUtils";
import styles from "./Profile.module.css";

function getMinDateTime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d.toISOString().slice(0, 16);
}

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("raf");
  const { shelfIds, user } = useApp();
  const [myStories, setMyStories] = useState([]);
  const [shelfStories, setShelfStories] = useState([]);

  // Story delete
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Bağlantılar
  const [connections, setConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [anonConnections, setAnonConnections] = useState([]);
  const [anonRequestsSent, setAnonRequestsSent] = useState({});
  const [pendingAnonRequests, setPendingAnonRequests] = useState([]);
  const [openToAnon, setOpenToAnon] = useState(false);
  const [hasAnonStories, setHasAnonStories] = useState(false);

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
  const username = "@" + (user?.email?.split("@")[0] || "kullanici").toLowerCase();
  const bio = user?.user_metadata?.bio || "";
  const initials = getInitials(displayName);

  // Load avatar + open_to_anon_connect
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url, open_to_anon_connect").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.avatar_url) {
          const base = data.avatar_url.split("?")[0];
          setAvatarUrl(base + "?t=" + Date.now());
        }
        if (data?.open_to_anon_connect != null) setOpenToAnon(data.open_to_anon_connect);
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
      .then(({ data }) => {
        setMyStories(data || []);
        setHasAnonStories((data || []).some((s) => s.is_anonymous));
      });
  }, [user]);

  // Load shelf stories: story_saves → stories (doğrudan Supabase)
  useEffect(() => {
    if (!user) { setShelfStories([]); return; }

    (async () => {
      const { data: saves } = await supabase
        .from("story_saves")
        .select("story_id")
        .eq("user_id", user.id);

      if (!saves?.length) { setShelfStories([]); return; }

      const ids = saves.map((r) => r.story_id);
      const { data } = await supabase.from("stories").select("*").in("id", ids);
      setShelfStories((data || []).map(mapSupabaseStory));
    })();
  }, [user, shelfIds]); // shelfIds bağımlılığı toggle sonrası yenileme için

  // Fetch connections on mount (for count in stats) and when tab is active
  useEffect(() => {
    if (!user || connections.length > 0) return;
    setConnectionsLoading(true);

    async function fetchConnections() {
      const { data: myStoriesData } = await supabase
        .from("stories")
        .select("category")
        .eq("user_id", user.id)
        .eq("published", true);

      const myCats = new Set((myStoriesData || []).map((s) => s.category.toLowerCase()));
      if (myCats.size === 0) { setConnectionsLoading(false); return; }

      // Anonim olmayan hikayelerden bağlantılar (id + title dahil)
      const { data: otherStories } = await supabase
        .from("stories")
        .select("user_id, author_name, category, id, title")
        .eq("published", true)
        .eq("is_anonymous", false)
        .neq("user_id", user.id);

      const userMap = {};
      (otherStories || []).forEach((s) => {
        if (!userMap[s.user_id]) {
          userMap[s.user_id] = { user_id: s.user_id, author_name: s.author_name, cats: new Set(), stories: {} };
        }
        const cat = s.category.toLowerCase();
        userMap[s.user_id].cats.add(cat);
        if (!userMap[s.user_id].stories[cat]) {
          userMap[s.user_id].stories[cat] = { id: s.id, title: s.title };
        }
      });

      const matches = Object.values(userMap)
        .map((u) => {
          const common = [...u.cats].filter((c) => myCats.has(c));
          return { user_id: u.user_id, author_name: u.author_name, commonCats: common, stories: u.stories };
        })
        .filter((u) => u.commonCats.length > 0)
        .sort((a, b) => b.commonCats.length - a.commonCats.length)
        .slice(0, 25);

      setConnections(matches);
      const regularUserIds = new Set(matches.map((m) => m.user_id));

      // Anonim bağlantı sistemi — paralel yükle
      const [{ data: anonProfiles }, { data: sentReqs }, { data: incomingReqs }] = await Promise.all([
        supabase.from("profiles").select("id").eq("open_to_anon_connect", true).neq("id", user.id),
        supabase.from("anon_connect_requests").select("to_user_id, status").eq("from_user_id", user.id),
        supabase.from("anon_connect_requests").select("id, from_user_id, created_at").eq("to_user_id", user.id).eq("status", "pending"),
      ]);

      // Gönderilen istek durumları
      const sentMap = {};
      (sentReqs || []).forEach((r) => { sentMap[r.to_user_id] = r.status; });
      setAnonRequestsSent(sentMap);

      // Regular bağlantılarda olmayan anonim yazarlar
      const anonUserIds = (anonProfiles || []).map((p) => p.id).filter((id) => !regularUserIds.has(id));

      if (anonUserIds.length > 0) {
        const { data: anonStories } = await supabase
          .from("stories").select("user_id, category").eq("published", true).in("user_id", anonUserIds);

        const anonMap = {};
        (anonStories || []).forEach((s) => {
          if (!anonMap[s.user_id]) anonMap[s.user_id] = new Set();
          anonMap[s.user_id].add(s.category.toLowerCase());
        });

        setAnonConnections(
          Object.entries(anonMap)
            .map(([uid, cats]) => ({ user_id: uid, commonCats: [...cats].filter((c) => myCats.has(c)) }))
            .filter((u) => u.commonCats.length > 0)
        );
      } else {
        setAnonConnections([]);
      }

      // Gelen bekleyen istekler — isim yükle
      if (incomingReqs && incomingReqs.length > 0) {
        const { data: fromProfiles } = await supabase
          .from("profiles").select("id, full_name").in("id", incomingReqs.map((r) => r.from_user_id));
        const pMap = {};
        (fromProfiles || []).forEach((p) => { pMap[p.id] = p.full_name || "Kullanıcı"; });
        setPendingAnonRequests(incomingReqs.map((r) => ({ ...r, from_name: pMap[r.from_user_id] || "Kullanıcı" })));
      } else {
        setPendingAnonRequests([]);
      }

      setConnectionsLoading(false);
    }

    fetchConnections();
  }, [user]);

  async function toggleOpenToAnon() {
    const next = !openToAnon;
    setOpenToAnon(next);
    await supabase.from("profiles").update({ open_to_anon_connect: next }).eq("id", user.id);
  }

  async function sendAnonRequest(toUserId) {
    setAnonRequestsSent((prev) => ({ ...prev, [toUserId]: "pending" }));
    await supabase.from("anon_connect_requests").insert({ from_user_id: user.id, to_user_id: toUserId });
  }

  async function acceptAnonRequest(requestId, fromUserId) {
    await supabase.from("anon_connect_requests").update({ status: "accepted" }).eq("id", requestId);
    setPendingAnonRequests((prev) => prev.filter((r) => r.id !== requestId));
    navigate(`/mesajlar/${fromUserId}`);
  }

  async function rejectAnonRequest(requestId) {
    await supabase.from("anon_connect_requests").update({ status: "rejected" }).eq("id", requestId);
    setPendingAnonRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  async function deleteStory(id) {
    await supabase.from("stories").delete().eq("id", id);
    setMyStories((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  }

  async function startLiveStream() {
    if (!liveTitle.trim() || !user) return;
    setStartingLive(true);
    setLiveError("");
    const roomName = `live-${user.id.slice(0, 8)}-${Date.now()}`;
    const { error } = await supabase.from("live_sessions").insert({
      host_id: user.id,
      host_name: displayName,
      host_avatar: initials,
      room_name: roomName,
      title: liveTitle.trim(),
    });
    setStartingLive(false);
    if (error) {
      setLiveError("Başlatılamadı: " + error.message);
    } else {
      setShowLiveModal(false);
      setLiveTitle("");
      navigate(`/canli/${roomName}`);
    }
  }

  async function scheduleLiveStream() {
    if (!planTitle.trim() || !planDate || !user) return;
    setPlanningLive(true);
    setPlanError("");
    const roomName = `plan-${user.id.slice(0, 8)}-${Date.now()}`;
    const { error } = await supabase.from("live_sessions").insert({
      host_id: user.id,
      host_name: displayName,
      host_avatar: initials,
      room_name: roomName,
      title: planTitle.trim(),
      description: planDesc.trim(),
      is_active: false,
      is_scheduled: true,
      scheduled_at: new Date(planDate).toISOString(),
    });
    setPlanningLive(false);
    if (error) {
      setPlanError("Planlanamadı: " + error.message);
    } else {
      setPlanDone(true);
      setTimeout(() => {
        setShowPlanModal(false);
        setPlanTitle(""); setPlanDesc(""); setPlanDate(""); setPlanDone(false);
      }, 2200);
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Header ─────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.settingsBtn} onClick={() => navigate("/ayarlar")}>
          <SettingsIcon />
        </button>
        <button className={styles.messagesBtn} onClick={() => navigate("/mesajlar")}>
          <MessagesBubbleIcon />
        </button>

        <div className={styles.avatarWrap}>
          {avatarUrl ? (
            <img src={avatarUrl} className={styles.avatarImg} alt={displayName} />
          ) : (
            <div className={styles.avatar}>{initials}</div>
          )}
        </div>

        <div className={styles.profileText}>
          <h1 className={styles.name}>{displayName}</h1>
          <p className={styles.username}>{username}</p>
          {bio && <p className={styles.bio}>{bio}</p>}
          <button className={styles.editProfileBtn} onClick={() => navigate("/ayarlar")}>Profili Düzenle</button>
        </div>

        <div className={styles.headerLive}>
          <button className={styles.liveBtn} onClick={() => { setShowLiveModal(true); setLiveError(""); }}>
            <span className={styles.liveDot} />
            Canlı Yayın
          </button>
          <button className={styles.planBtn} onClick={() => { setShowPlanModal(true); setPlanError(""); setPlanDone(false); }}>
            <CalendarIcon />
            Planla
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────── */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}><ShelfStatIcon /></span>
          <span className={styles.statNum}>{shelfIds.length}</span>
          <span className={styles.statLabel}>Rafımda</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}><BookStatIcon /></span>
          <span className={styles.statNum}>{myStories.length}</span>
          <span className={styles.statLabel}>Hikaye</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}><ConnectStatIcon /></span>
          <span className={styles.statNum}>{connections.length}</span>
          <span className={styles.statLabel}>Bağlantı</span>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────── */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === "raf" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("raf")}
        >
          Rafım
        </button>
        <button
          className={`${styles.tab} ${activeTab === "hikaye" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("hikaye")}
        >
          Hikayem
        </button>
        <button
          className={`${styles.tab} ${activeTab === "baglantilar" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("baglantilar")}
        >
          Bağlantılar
        </button>
      </div>

      {/* ── Tab content ────────────────────────── */}
      <div className={styles.tabContent}>

        {/* Rafım */}
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

        {/* Hikayem */}
        {activeTab === "hikaye" && (
          <div className={styles.storiesTab}>
            <Link to="/yaz" className={styles.newStoryBtn}>
              <span className={styles.newStoryPlus}>+</span>
              Yeni Hikaye Yaz
            </Link>
            {myStories.length === 0 ? (
              <EmptyState emoji="✍️" title="Henüz hikayeniz yok" desc="İlk hikayeni yaz ve topluluğa katıl!" />
            ) : (
              myStories.map((s) => (
                <div key={s.id} className={styles.myStoryRow}>
                  {confirmDeleteId === s.id ? (
                    <div className={styles.deleteConfirm}>
                      <p className={styles.deleteConfirmText}>Bu hikayeyi silmek istediğinden emin misin?</p>
                      <div className={styles.deleteConfirmActions}>
                        <button className={styles.cancelDeleteBtn} onClick={() => setConfirmDeleteId(null)}>İptal</button>
                        <button className={styles.confirmDeleteBtn} onClick={() => deleteStory(s.id)}>Evet, Sil</button>
                      </div>
                    </div>
                  ) : (
                    <Link to={`/hikaye/${s.id}`} className={styles.myStoryCard}>
                      <div className={styles.myStoryBody}>
                        <p className={styles.myStoryTitle}>{s.title}</p>
                        <p className={styles.myStoryMeta}>
                          {s.category}
                          {s.is_anonymous && <span className={styles.anonBadge}>Anonim</span>}
                        </p>
                      </div>
                      <div className={styles.myStoryLikes}>
                        <span>❤</span>
                        <span>{s.likes}</span>
                      </div>
                    </Link>
                  )}
                  {confirmDeleteId !== s.id && (
                    <button
                      className={styles.deleteStoryBtn}
                      onClick={() => setConfirmDeleteId(s.id)}
                      title="Sil"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Bağlantılarım */}
        {activeTab === "baglantilar" && (
          <div className={styles.connectionsTab}>

            {/* Bağlantıya Açık toggle */}
            {hasAnonStories && (
              <div className={styles.anonToggleRow}>
                <div className={styles.anonToggleText}>
                  <p className={styles.anonToggleLabel}>Bağlantıya Açık</p>
                  <p className={styles.anonToggleDesc}>Anonim kimliğinle bağlantı kurmak isteyenlere görün</p>
                </div>
                <button
                  className={`${styles.toggle} ${openToAnon ? styles.toggleOn : ""}`}
                  onClick={toggleOpenToAnon}
                  role="switch"
                  aria-checked={openToAnon}
                >
                  <span className={styles.knob} />
                </button>
              </div>
            )}

            {connectionsLoading ? (
              <div className={styles.connLoading}>
                {[0,1,2].map((i) => <span key={i} className={styles.connDot} style={{ animationDelay: `${i*0.2}s` }} />)}
              </div>
            ) : (
              <>
                {/* Gelen anonim istekler */}
                {pendingAnonRequests.length > 0 && (
                  <>
                    <p className={styles.connSectionTitle}>Gelen İstekler</p>
                    {pendingAnonRequests.map((req) => (
                      <div key={req.id} className={styles.connectionCard}>
                        <div className={styles.connectionAvatar}>{getInitials(req.from_name)}</div>
                        <div className={styles.connectionBody}>
                          <p className={styles.connectionName}>{req.from_name}</p>
                          <p className={styles.reqDesc}>Seninle bağlantı kurmak istiyor</p>
                        </div>
                        <div className={styles.reqActions}>
                          <button className={styles.rejectBtn} onClick={() => rejectAnonRequest(req.id)}>Hayır</button>
                          <button className={styles.acceptBtn} onClick={() => acceptAnonRequest(req.id, req.from_user_id)}>Kabul</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Boş durum */}
                {connections.length === 0 && anonConnections.length === 0 && pendingAnonRequests.length === 0 && !hasAnonStories && (
                  <EmptyState emoji="🤝" title="Henüz eşleşme yok" desc="Hikaye yaz, aynı kategoriyi kullanan yazarlarla eşleş!" />
                )}

                {/* Eşleşmeler başlığı */}
                {(connections.length > 0 || anonConnections.length > 0) && pendingAnonRequests.length > 0 && (
                  <p className={styles.connSectionTitle}>Eşleşmeler</p>
                )}

                {/* Normal bağlantılar */}
                {connections.map((c) => (
                  <div key={c.user_id} className={styles.connectionCard}>
                    <div className={styles.connectionAvatar} onClick={() => navigate(`/kullanici/${c.user_id}`)}>
                      {getInitials(c.author_name)}
                    </div>
                    <div className={styles.connectionBody}>
                      <p className={styles.connectionName} onClick={() => navigate(`/kullanici/${c.user_id}`)}>
                        {c.author_name}
                      </p>
                      <div className={styles.connectionCats}>
                        {c.commonCats.slice(0, 3).map((cat) => (
                          <div key={cat} className={styles.catGroup}>
                            <span className={styles.catBadge}>{cat}</span>
                            {c.stories[cat] && (
                              <Link to={`/hikaye/${c.stories[cat].id}`} className={styles.connStoryTitle}>
                                {c.stories[cat].title}
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className={styles.msgBtn} onClick={() => navigate(`/mesajlar/${c.user_id}`)} title="Mesaj at">
                      <ChatIcon />
                    </button>
                  </div>
                ))}

                {/* Anonim yazarlar */}
                {anonConnections.length > 0 && (
                  <>
                    {connections.length > 0 && <p className={styles.connSectionTitle}>Anonim Yazarlar</p>}
                    {anonConnections.map((a) => {
                      const status = anonRequestsSent[a.user_id];
                      return (
                        <div key={a.user_id} className={styles.connectionCard}>
                          <div className={`${styles.connectionAvatar} ${styles.anonAvatar}`}>?</div>
                          <div className={styles.connectionBody}>
                            <p className={styles.connectionName}>Anonim Yazar</p>
                            <div className={styles.connectionBadges}>
                              {a.commonCats.slice(0, 3).map((cat) => (
                                <span key={cat} className={styles.catBadge}>{cat}</span>
                              ))}
                            </div>
                          </div>
                          {status === "accepted" ? (
                            <button className={styles.msgBtn} onClick={() => navigate(`/mesajlar/${a.user_id}`)} title="Sohbet">
                              <ChatIcon />
                            </button>
                          ) : status === "pending" ? (
                            <span className={styles.reqSent}>Gönderildi</span>
                          ) : (
                            <button className={styles.connectAnonBtn} onClick={() => sendAnonRequest(a.user_id)}>
                              Bağlan
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Live modal ──────────────────────────── */}
      {showLiveModal && (
        <div className={styles.overlay} onClick={() => setShowLiveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Canlı Yayın Başlat</h3>
            <p className={styles.modalDesc}>Yayın başlığını gir.</p>
            <input
              className={styles.modalInput}
              placeholder="Örn: Hikayemi anlatıyorum…"
              value={liveTitle}
              onChange={(e) => setLiveTitle(e.target.value)}
              maxLength={80}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && startLiveStream()}
            />
            {liveError && <p className={styles.modalError}>{liveError}</p>}
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowLiveModal(false)}>İptal</button>
              <button className={styles.modalStart} onClick={startLiveStream} disabled={!liveTitle.trim() || startingLive}>
                {startingLive ? "Başlatılıyor…" : "🔴 Yayın Başlat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plan modal ──────────────────────────── */}
      {showPlanModal && (
        <div className={styles.overlay} onClick={() => !planDone && setShowPlanModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {planDone ? (
              <div className={styles.planSuccess}>
                <span>📅</span>
                <p>Yayın planlandı! "Yakında" bölümünde görünüyor.</p>
              </div>
            ) : (
              <>
                <h3 className={styles.modalTitle}>Yayın Planla</h3>
                <p className={styles.modalDesc}>Tarihi ve saati seç.</p>
                <input className={styles.modalInput} placeholder="Yayın başlığı…" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} maxLength={80} autoFocus />
                <textarea className={`${styles.modalInput} ${styles.modalTextarea}`} placeholder="Açıklama (isteğe bağlı)" value={planDesc} onChange={(e) => setPlanDesc(e.target.value)} maxLength={200} rows={3} />
                <div className={styles.modalDateLabel}>Tarih ve Saat</div>
                <input type="datetime-local" className={styles.modalInput} value={planDate} min={getMinDateTime()} onChange={(e) => setPlanDate(e.target.value)} />
                {planDate && (
                  <p className={styles.planDateNote}>
                    {new Date(planDate).toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {planError && <p className={styles.modalError}>{planError}</p>}
                <div className={styles.modalActions}>
                  <button className={styles.modalCancel} onClick={() => setShowPlanModal(false)}>İptal</button>
                  <button className={styles.modalStart} onClick={scheduleLiveStream} disabled={!planTitle.trim() || !planDate || planningLive}>
                    {planningLive ? "Planlanıyor…" : "📅 Planla"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ShelfStatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="4" width="4" height="16" rx="1"/>
      <rect x="8" y="6" width="4" height="14" rx="1"/>
      <rect x="14" y="3" width="4" height="17" rx="1"/>
      <line x1="2" y1="21" x2="20" y2="21"/>
    </svg>
  );
}

function BookStatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ConnectStatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="3" />
      <circle cx="18" cy="5" r="2" />
      <circle cx="18" cy="19" r="2" />
      <line x1="11.5" y1="10.5" x2="16.5" y2="6.5" />
      <line x1="11.5" y1="13.5" x2="16.5" y2="17.5" />
    </svg>
  );
}
