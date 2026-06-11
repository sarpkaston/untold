import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { getCoverColor, calcReadTime, formatDate } from "../lib/storyUtils";
import styles from "./MyStory.module.css";

export default function MyStory() {
  const { user } = useApp();
  const [tab, setTab] = useState("published");
  const [publishedStories, setPublishedStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("stories")
      .select("*")
      .eq("user_id", user.id)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPublishedStories(data || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Hikayem</h1>
        <Link to="/yaz" className={styles.newBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yeni
        </Link>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "published" ? styles.tabActive : ""}`}
          onClick={() => setTab("published")}
        >
          Yayınlananlar {publishedStories.length > 0 && `(${publishedStories.length})`}
        </button>
        <button
          className={`${styles.tab} ${tab === "tips" ? styles.tabActive : ""}`}
          onClick={() => setTab("tips")}
        >
          İlham
        </button>
      </div>

      {tab === "published" && (
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingWrap}>
              <div className={styles.loadingDots}>
                <span /><span /><span />
              </div>
            </div>
          ) : publishedStories.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✍️</span>
              <p className={styles.emptyText}>Henüz yayınlanmış hikaye yok</p>
              <Link to="/yaz" className={styles.startBtn}>İlk Hikayeni Yaz</Link>
            </div>
          ) : (
            <div className={styles.storyList}>
              {publishedStories.map((s) => (
                <PublishedStoryCard key={s.id} story={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "tips" && (
        <div className={styles.content}>
          <div className={styles.tips}>
            <h4 className={styles.tipsTitle}>Yazmak için ilham</h4>

            {/* ── ✨ En önemli soru — listenin tepesi ── */}
            <div className={styles.featuredTip}>
              <div className={styles.featuredTipAccent} />
              <div className={styles.featuredTipBody}>
                <span className={styles.featuredTipLabel}>✨ En önemli soru:</span>
                <p className={styles.featuredTipText}>"Seni diğerlerinden ayıran ne?"</p>
              </div>
            </div>

            {[
              "Çocukluğunda en çok korktuğun şeyi anlat.",
              "Hayatını değiştiren bir karar almadan önceki an.",
              "Seni en iyi anlayan kişi kimdi?",
              "Pişman olmadığın en büyük hatan neydi?",
              "Sana 'olmaz' denen ama başardığın şey.",
              "Yalnız kaldığında ne düşünürsün?",
            ].map((tip, i) => (
              <div key={i} className={styles.tip}>
                <span className={styles.tipNum}>{i + 1}</span>
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PublishedStoryCard({ story }) {
  const color = getCoverColor(story.category);
  const wordCount = story.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className={styles.pubCard}>
      <div className={styles.pubCover} style={{ background: color }}>
        <div className={styles.pubSpine} />
        <div className={styles.pubCoverContent}>
          <span className={styles.pubCat}>{story.category}</span>
          <p className={styles.pubTitle}>{story.title}</p>
        </div>
        {story.is_anonymous && (
          <span className={styles.anonBadge}>Anonim</span>
        )}
      </div>
      <div className={styles.pubBody}>
        <p className={styles.pubStoryTitle}>{story.title}</p>
        {story.subtitle && <p className={styles.pubSubtitle}>{story.subtitle}</p>}
        <div className={styles.pubMeta}>
          <span>{wordCount} kelime · {calcReadTime(story.content)}</span>
          <span>{formatDate(story.created_at)}</span>
        </div>
        {story.is_anonymous && (
          <p className={styles.anonNote}>Anonim olarak yayınlandı</p>
        )}
        <div className={styles.pubStats}>
          <span>❤ {story.likes}</span>
        </div>
      </div>
    </div>
  );
}
