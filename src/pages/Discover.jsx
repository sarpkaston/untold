import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory, getCoverGradient } from "../lib/storyUtils";
import { useApp } from "../context/AppContext";
import StoryMenu from "../components/StoryMenu";
import styles from "./Discover.module.css";

export default function Discover() {
  const { user, isLiked, toggleLike, isReported } = useApp();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myCats, setMyCats] = useState(new Set());
  const [avatarMap, setAvatarMap] = useState({});
  const feedRef = useRef(null);
  const restoredRef = useRef(false);
  const saveTimer = useRef(null);
  const SCROLL_KEY = "discover_active_id";
  const [blockedStoryIds, setBlockedStoryIds] = useState(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());
  const [blockedLoaded, setBlockedLoaded] = useState(false);
  const [userInterests, setUserInterests] = useState(new Set()); // lowercase set

  useEffect(() => {
    supabase.rpc("auto_publish_scheduled_stories").then(() => {});

    async function load() {
      const { data, error } = await supabase
        .from("stories")
        .select("*, story_comments(count)")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(25);

      setStories(!error && data ? data.map(mapSupabaseStory) : []);
      setLoading(false);

      if (!error && data) {
        const userIds = [...new Set(data.filter(s => !s.is_anonymous && s.user_id).map(s => s.user_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, avatar_url").in("id", userIds);
          const map = {};
          (profiles || []).forEach(p => { if (p.avatar_url) map[p.id] = p.avatar_url; });
          setAvatarMap(map);
        }
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("stories")
      .select("category")
      .eq("user_id", user.id)
      .eq("published", true)
      .then(({ data }) => setMyCats(new Set((data || []).map((s) => s.category.toLowerCase()))));
  }, [user]);

  // Gizlenen içerikler + ilgi alanlarını birlikte yükle
  useEffect(() => {
    if (!user) { setBlockedLoaded(true); return; }
    Promise.all([
      supabase.from("blocked_stories").select("story_id").eq("user_id", user.id),
      supabase.from("blocked_users").select("blocked_user_id").eq("user_id", user.id),
      supabase.from("profiles").select("interests").eq("id", user.id).single(),
    ]).then(([{ data: bs }, { data: bu }, { data: profile }]) => {
      setBlockedStoryIds(new Set((bs || []).map(r => r.story_id)));
      setBlockedUserIds(new Set((bu || []).map(r => r.blocked_user_id)));
      setUserInterests(new Set((profile?.interests || []).map(i => i.toLowerCase())));
      setBlockedLoaded(true);
    });
  }, [user]);

  function handleBlock(storyId, authorUserId) {
    setBlockedStoryIds(prev => new Set([...prev, storyId]));
    if (authorUserId) setBlockedUserIds(prev => new Set([...prev, authorUserId]));
  }

  // Görüntülenecek hikayeler: filtrele → ilgi alanlarına göre öne al
  const displayedStories = stories
    .filter(s => !blockedStoryIds.has(s.id) && (!s.userId || !blockedUserIds.has(s.userId)))
    .sort((a, b) => {
      const aM = userInterests.has((a.category || "").toLowerCase());
      const bM = userInterests.has((b.category || "").toLowerCase());
      if (aM === bM) return 0;
      return aM ? -1 : 1;
    });

  // Scroll pozisyonunu geri yükle (stories + blocked + interests yüklenince, bir kez)
  useEffect(() => {
    if (!blockedLoaded || stories.length === 0 || restoredRef.current) return;
    restoredRef.current = true;
    const savedId = sessionStorage.getItem(SCROLL_KEY);
    if (!savedId || !feedRef.current) return;
    const index = displayedStories.findIndex(s => s.id === savedId);
    if (index <= 0) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (feedRef.current) {
          feedRef.current.scrollTop = index * feedRef.current.clientHeight;
        }
      });
    });
  }, [stories, blockedLoaded]);

  function handleScroll() {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!feedRef.current) return;
      const { scrollTop, clientHeight } = feedRef.current;
      const index = Math.round(scrollTop / clientHeight);
      const id = displayedStories[index]?.id;
      if (id) sessionStorage.setItem(SCROLL_KEY, id);
    }, 150);
  }

  async function handleLike(storyId) {
    const wasLiked = isLiked(storyId);
    const delta = wasLiked ? -1 : 1;
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, likes: (s.likes || 0) + delta } : s));
    const { error } = await toggleLike(storyId);
    if (error) {
      setStories(prev => prev.map(s => s.id === storyId ? { ...s, likes: (s.likes || 0) - delta } : s));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logoWrap}>
          <div className={styles.bookIconWrap}>
            <div className={styles.bookPg} />
            <div className={styles.bookPg} />
            <div className={styles.bookPg} />
          </div>
          <span className={styles.logo}>Untold</span>
        </div>
      </div>

      <div className={styles.feed} ref={feedRef} onScroll={handleScroll}>
        {loading ? (
          <>
            <SlideSkeletonCard />
            <SlideSkeletonCard />
          </>
        ) : stories.length === 0 ? (
          <div className={styles.emptyFeed}>
            <p>Henüz hikaye yok.</p>
          </div>
        ) : (
          displayedStories.map((story) => (
            <SlideCard
              key={story.id}
              story={story}
              liked={isLiked(story.id)}
              onLike={handleLike}
              isConnected={
                !story.isAnonymous &&
                story.userId &&
                myCats.size > 0 &&
                myCats.has(story.category?.toLowerCase())
              }
              isInterest={userInterests.has((story.category || "").toLowerCase())}
              isReported={isReported(story.id)}
              avatarUrl={story.isAnonymous ? null : (avatarMap[story.userId] || null)}
              onBlock={handleBlock}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SlideCard({ story, liked, onLike, isConnected, isInterest, isReported, avatarUrl, onBlock }) {
  return (
    <div id={`slide-${story.id}`} className={styles.slide}>
      <div className={isReported ? styles.slideBlurredInner : undefined}>
        <div className={styles.slideBg} style={{ background: getCoverGradient(story.category) }} />
        <div className={styles.slideGrain} />
        <div className={styles.slideGradient} />

        <div className={styles.slideActions}>
          <button
            className={`${styles.slideActionBtn} ${liked ? styles.slideActionActive : ""}`}
            onClick={() => onLike(story.id)}
          >
            <HeartIcon filled={liked} />
            <span className={styles.slideActionLabel}>{story.likes || 0}</span>
          </button>
          <Link to={`/hikaye/${story.id}`} className={styles.slideActionBtn}>
            <CommentIcon />
            <span className={styles.slideActionLabel}>{story.commentCount ?? 0}</span>
          </Link>
        </div>

        <div className={styles.slideContent}>
          <div className={styles.slideBadgeRow}>
            <span className={styles.slideCatBadge}>{story.category}</span>
            {isInterest && <span className={styles.slideInterestBadge}>✦ İlgi alanın</span>}
          </div>
          <h2 className={styles.slideTitle}>{story.title}</h2>
          {story.subtitle && <p className={styles.slideSubtitle}>{story.subtitle}</p>}
          <div className={styles.slideAuthorRow}>
            {avatarUrl ? (
              <img src={avatarUrl} className={styles.slideAvatar} alt="" style={{ objectFit: "cover" }} />
            ) : (
              <div className={styles.slideAvatar}>{story.authorAvatar}</div>
            )}
            <div className={styles.slideAuthorInfo}>
              {!story.isAnonymous && story.userId ? (
                <Link to={`/kullanici/${story.userId}`} className={styles.slideAuthorName}>
                  {story.author}
                </Link>
              ) : (
                <span className={styles.slideAuthorName}>{story.author}</span>
              )}
              {isConnected && (
                <span className={styles.slideConnectedBadge}>Bağlantın · {story.category}</span>
              )}
            </div>
          </div>
          {story.preview && (
            <p className={styles.slidePreview}>
              {story.preview.slice(0, 140).trim()}…
            </p>
          )}
        </div>

        <Link to={`/hikaye/${story.id}`} className={styles.slideReadBtn}>
          Okumaya Başla
        </Link>
      </div>

      {/* Menü butonu her zaman erişilebilir */}
      <StoryMenu
        storyId={story.id}
        authorUserId={story.userId}
        authorName={story.isAnonymous ? "Anonim Yazar" : story.author}
        storyTitle={story.title}
        onBlock={onBlock}
        triggerClass={styles.slideMenuBtn}
      />

      {isReported && (
        <div className={styles.reportedSlideOverlay}>
          <span className={styles.reportedCheckIcon}>✓</span>
          <p className={styles.reportedSlideLabel}>Şikayet edildi</p>
        </div>
      )}
    </div>
  );
}

function SlideSkeletonCard() {
  return (
    <div className={styles.slide}>
      <div className={styles.skBg} />
      <div className={styles.skContent}>
        <div className={`${styles.sk} ${styles.skBadge}`} />
        <div className={`${styles.sk} ${styles.skTitle}`} />
        <div className={`${styles.sk} ${styles.skTitle2}`} />
        <div className={`${styles.sk} ${styles.skAuthor}`} />
      </div>
      <div className={`${styles.sk} ${styles.skReadBtn}`} />
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
