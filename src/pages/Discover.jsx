import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import StoryFeed from "../components/StoryFeed";
import LiveSession from "../components/LiveSession";
import Gundem from "../components/Gundem";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory, getCoverColor } from "../lib/storyUtils";
import { useApp } from "../context/AppContext";
import styles from "./Discover.module.css";

export default function Discover() {
  const { user } = useApp();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(true);

  // Zamanı gelen planlanmış hikayeleri otomatik yayınla
  useEffect(() => {
    supabase.rpc("auto_publish_scheduled_stories").then(() => {});
  }, []);

  useEffect(() => {
    async function fetchStories() {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(30);

      setStories(!error && data ? data.map(mapSupabaseStory) : []);
      setLoading(false);
    }
    fetchStories();
  }, []);

  useEffect(() => {
    async function fetchRecommendations() {
      setRecLoading(true);

      let topCats = [];

      if (user) {
        // Kullanıcının beğendiği ve kendi yazdığı hikayelerin kategorileri
        const [{ data: likedRows }, { data: ownRows }, { data: viewedRows }] = await Promise.all([
          supabase.from("story_likes").select("story_id").eq("user_id", user.id).limit(50),
          supabase.from("stories").select("category").eq("user_id", user.id).eq("published", true),
          supabase.from("story_views").select("story_id").eq("user_id", user.id).limit(30),
        ]);

        const interactedIds = [
          ...(likedRows || []).map((r) => r.story_id),
          ...(viewedRows || []).map((r) => r.story_id),
        ].filter(Boolean);

        let interactedCats = [];
        if (interactedIds.length > 0) {
          const { data: interactedStories } = await supabase
            .from("stories")
            .select("category")
            .in("id", interactedIds);
          interactedCats = (interactedStories || []).map((s) => s.category);
        }

        const catCount = {};
        [...interactedCats, ...(ownRows || []).map((s) => s.category)].forEach((cat) => {
          catCount[cat] = (catCount[cat] || 0) + 1;
        });

        topCats = Object.entries(catCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat);
      }

      // Eğer kategori verisi yoksa (yeni kullanıcı) → en çok beğenilen 5 hikaye
      if (topCats.length === 0) {
        const { data } = await supabase
          .from("stories")
          .select("*")
          .eq("published", true)
          .order("likes", { ascending: false })
          .limit(6);
        setRecommended((data || []).map(mapSupabaseStory));
        setRecLoading(false);
        return;
      }

      // İlgi alanlarına göre hikayeler — kendi hikayeleri hariç
      const query = supabase
        .from("stories")
        .select("*")
        .eq("published", true)
        .in("category", topCats)
        .order("likes", { ascending: false })
        .limit(10);

      if (user) query.neq("user_id", user.id);

      const { data: recData } = await query;
      setRecommended((recData || []).map(mapSupabaseStory));
      setRecLoading(false);
    }

    fetchRecommendations();
  }, [user]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.logo}>Untold</span>
          <p className={styles.tagline}>Her insan bir kitaptır.</p>
        </div>
      </div>

      <LiveSession />

      {/* ── Sana Özel ────────────────────────── */}
      {!recLoading && recommended.length > 0 && (
        <div className={styles.recSection}>
          <div className={styles.recHeader}>
            <span className={styles.recTitle}>Sana Özel</span>
            <span className={styles.recSub}>İlgi alanlarına göre seçildi</span>
          </div>
          <div className={styles.recScroll}>
            {recommended.slice(0, 6).map((s) => (
              <Link to={`/hikaye/${s.id}`} key={s.id} className={styles.recCard}>
                <div className={styles.recCover} style={{ background: s.coverColor }}>
                  <div className={styles.recSpine} />
                  <div className={styles.recLines} />
                  <div className={styles.recContent}>
                    <span className={styles.recCat}>{s.category}</span>
                    <p className={styles.recName}>{s.title}</p>
                  </div>
                </div>
                <p className={styles.recAuthor}>{s.author}</p>
                <p className={styles.recMeta}>{s.readTime} · {s.likes} beğeni</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.loadingDots}>
            <span /><span /><span />
          </div>
        </div>
      ) : (
        <StoryFeed stories={stories} />
      )}

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>Gündem</span>
        <span className={styles.dividerLine} />
      </div>
      <Gundem />
    </div>
  );
}
