import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory } from "../lib/storyUtils";
import { useApp } from "../context/AppContext";
import styles from "./Discover.module.css";

export default function Discover() {
  const { user, isLiked, toggleLike } = useApp();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myCats, setMyCats] = useState(new Set());
  const [likeDeltaMap, setLikeDeltaMap] = useState({});

  useEffect(() => {
    supabase.rpc("auto_publish_scheduled_stories").then(() => {});

    supabase
      .from("stories")
      .select("*, story_comments(count)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(25)
      .then(({ data, error }) => {
        setStories(!error && data ? data.map(mapSupabaseStory) : []);
        setLoading(false);
      });
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

  async function handleLike(storyId) {
    const wasLiked = isLiked(storyId);
    const delta = wasLiked ? -1 : 1;
    setLikeDeltaMap((prev) => ({ ...prev, [storyId]: (prev[storyId] || 0) + delta }));
    const { error } = await toggleLike(storyId);
    if (error) {
      setLikeDeltaMap((prev) => ({ ...prev, [storyId]: (prev[storyId] || 0) - delta }));
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

      <div className={styles.feed}>
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
          stories.map((story) => (
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
              likeDelta={likeDeltaMap[story.id] || 0}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SlideCard({ story, liked, onLike, isConnected, likeDelta }) {
  return (
    <div className={styles.slide}>
      <div className={styles.slideBg} style={{ background: story.coverColor }} />
      <div className={styles.slideGrain} />
      <div className={styles.slideGradient} />

      <div className={styles.slideActions}>
        <button
          className={`${styles.slideActionBtn} ${liked ? styles.slideActionActive : ""}`}
          onClick={() => onLike(story.id)}
        >
          <HeartIcon filled={liked} />
          <span className={styles.slideActionLabel}>{(story.likes || 0) + likeDelta}</span>
        </button>
        <Link to={`/hikaye/${story.id}`} className={styles.slideActionBtn}>
          <CommentIcon />
          <span className={styles.slideActionLabel}>{story.commentCount ?? 0}</span>
        </Link>
      </div>

      <div className={styles.slideContent}>
        <span className={styles.slideCatBadge}>{story.category}</span>
        <h2 className={styles.slideTitle}>{story.title}</h2>
        {story.subtitle && <p className={styles.slideSubtitle}>{story.subtitle}</p>}
        <div className={styles.slideAuthorRow}>
          <div className={styles.slideAvatar}>{story.authorAvatar}</div>
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
