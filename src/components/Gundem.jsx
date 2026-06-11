import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory } from "../lib/storyUtils";
import styles from "./Gundem.module.css";

export default function Gundem() {
  const [byLikes, setByLikes] = useState([]);
  const [byComments, setByComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      const [{ data: topStories }, { data: commentRows }] = await Promise.all([
        supabase.from("stories").select("*").eq("published", true)
          .order("likes", { ascending: false }).limit(5),
        supabase.from("story_comments").select("story_id"),
      ]);

      setByLikes((topStories || []).map(mapSupabaseStory));

      const counts = {};
      (commentRows || []).forEach((r) => {
        counts[r.story_id] = (counts[r.story_id] || 0) + 1;
      });
      const topCommentedIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      if (topCommentedIds.length > 0) {
        const { data: commentedStories } = await supabase
          .from("stories").select("*").in("id", topCommentedIds);
        setByComments(
          (commentedStories || [])
            .map((s) => ({ ...mapSupabaseStory(s), commentCount: counts[s.id] || 0 }))
            .sort((a, b) => b.commentCount - a.commentCount)
        );
      }

      setLoading(false);
    }
    fetchTrending();
  }, []);

  if (loading || (byLikes.length === 0 && byComments.length === 0)) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.badge}>Bu Hafta</span>
        <h2 className={styles.title}>Gündem</h2>
      </div>

      {byLikes.length > 0 && (
        <div className={styles.block}>
          <div className={styles.blockHeader}>
            <FireIcon />
            <h3 className={styles.blockTitle}>En Çok Beğenilen</h3>
          </div>
          <div className={styles.list}>
            {byLikes.map((story, i) => (
              <Link to={`/hikaye/${story.id}`} key={story.id} className={styles.row}>
                <span className={`${styles.rank} ${i < 3 ? styles.rankTop : ""}`}>{i + 1}</span>
                <div className={styles.rowCover} style={{ background: story.coverColor }} />
                <div className={styles.rowBody}>
                  <p className={styles.rowTitle}>{story.title}</p>
                  <p className={styles.rowMeta}>{story.author}</p>
                </div>
                <div className={styles.rowStat}>
                  <HeartIcon />
                  <span>{story.likes}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {byComments.length > 0 && (
        <div className={styles.block}>
          <div className={styles.blockHeader}>
            <ChatIcon />
            <h3 className={styles.blockTitle}>En Çok Yorum Alan</h3>
          </div>
          <div className={styles.list}>
            {byComments.map((story, i) => (
              <Link to={`/hikaye/${story.id}`} key={story.id} className={styles.row}>
                <span className={`${styles.rank} ${i < 3 ? styles.rankTop : ""}`}>{i + 1}</span>
                <div className={styles.rowCover} style={{ background: story.coverColor }} />
                <div className={styles.rowBody}>
                  <p className={styles.rowTitle}>{story.title}</p>
                  <p className={styles.rowMeta}>{story.author}</p>
                </div>
                <div className={styles.rowStat}>
                  <ChatIcon small />
                  <span>{story.commentCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function FireIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--terracotta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ChatIcon({ small }) {
  const size = small ? 12 : 16;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={small ? "currentColor" : "var(--terracotta)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
