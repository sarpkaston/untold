import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory, getInitials } from "../lib/storyUtils";
import styles from "./UserProfile.module.css";

export default function UserProfile() {
  const { userId } = useParams();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [authorAvatar, setAuthorAvatar] = useState("");
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("user_id", userId)
        .eq("published", true)
        .eq("is_anonymous", false)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const name = data[0].author_name;
        const avatar = data[0].author_avatar || getInitials(name);
        setAuthorName(name);
        setAuthorAvatar(avatar);
        setTotalLikes(data.reduce((sum, s) => sum + (s.likes || 0), 0));
        setStories(data.map(mapSupabaseStory));
      }
      setLoading(false);
    }

    if (userId) fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <div className={styles.loadingDots}><span /><span /><span /></div>
        </div>
      </div>
    );
  }

  if (!authorName) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p className={styles.notFoundText}>Kullanıcı bulunamadı.</p>
          <Link to="/" className={styles.backLink}>← Ana Sayfaya Dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/" className={styles.backBtn}>←</Link>
        <div className={styles.coverBg} />
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>{authorAvatar}</div>
          <h1 className={styles.name}>{authorName}</h1>
          <p className={styles.bio}>Untold yazarı</p>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{stories.length}</span>
          <span className={styles.statLabel}>Hikaye</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <span className={styles.statNum}>{totalLikes}</span>
          <span className={styles.statLabel}>Beğeni</span>
        </div>
      </div>

      <div className={styles.content}>
        <h2 className={styles.sectionTitle}>Hikayeleri</h2>
        {stories.length === 0 ? (
          <p className={styles.empty}>Yayınlanmış hikaye yok.</p>
        ) : (
          <div className={styles.storyList}>
            {stories.map((s) => (
              <Link to={`/hikaye/${s.id}`} key={s.id} className={styles.storyRow}>
                <div className={styles.storyCover} style={{ background: s.coverColor }}>
                  <div className={styles.storySpine} />
                  <div className={styles.storyCoverText}>
                    <span className={styles.storyCat}>{s.category}</span>
                    <p className={styles.storyCoverTitle}>{s.title}</p>
                  </div>
                </div>
                <div className={styles.storyBody}>
                  <p className={styles.storyTitle}>{s.title}</p>
                  {s.subtitle && <p className={styles.storySub}>{s.subtitle}</p>}
                  <p className={styles.storyMeta}>{s.readTime} · ❤ {s.likes}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
