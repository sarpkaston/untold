import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory, getInitials } from "../lib/storyUtils";
import { useApp } from "../context/AppContext";
import styles from "./UserProfile.module.css";

export default function UserProfile() {
  const { userId } = useParams();
  const { user } = useApp();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [authorUsername, setAuthorUsername] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [authorAvatarUrl, setAuthorAvatarUrl] = useState(null);
  const [totalLikes, setTotalLikes] = useState(0);
  const [myCats, setMyCats] = useState(new Set());

  useEffect(() => {
    async function fetchProfile() {
      const [{ data: profileData }, { data: storiesData }] = await Promise.all([
        supabase.from("profiles").select("full_name, username, bio, avatar_url").eq("id", userId).single(),
        supabase.from("stories").select("*").eq("user_id", userId).eq("published", true).eq("is_anonymous", false).order("created_at", { ascending: false }),
      ]);

      if (profileData) {
        setAuthorName(profileData.full_name || "");
        setAuthorUsername(profileData.username || "");
        setAuthorBio(profileData.bio || "");
        if (profileData.avatar_url) {
          const base = profileData.avatar_url.split("?")[0];
          setAuthorAvatarUrl(base + "?t=" + Math.floor(Date.now() / 300000));
        }
      }

      if (storiesData && storiesData.length > 0) {
        if (!profileData?.full_name) setAuthorName(storiesData[0].author_name || "");
        setTotalLikes(storiesData.reduce((sum, s) => sum + (s.likes || 0), 0));
        setStories(storiesData.map(mapSupabaseStory));
      }

      setLoading(false);
    }

    if (userId) fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!user || user.id === userId) return;
    supabase.from("stories").select("category").eq("user_id", user.id).eq("published", true)
      .then(({ data }) => setMyCats(new Set((data || []).map(s => s.category?.toLowerCase()))));
  }, [user, userId]);

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

  const sharedCat = user && user.id !== userId
    ? stories.find(s => myCats.has(s.category?.toLowerCase()))?.category || null
    : null;

  const initials = getInitials(authorName);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/" className={styles.backBtn}>←</Link>
        <div className={styles.coverBg} />
        <div className={styles.profileInfo}>
          {authorAvatarUrl ? (
            <img src={authorAvatarUrl} className={styles.avatar} alt={authorName} style={{ objectFit: "cover" }} />
          ) : (
            <div className={styles.avatar}>{initials}</div>
          )}
          <h1 className={styles.name}>{authorName}</h1>
          {authorUsername ? <p className={styles.username}>@{authorUsername}</p> : null}
          {authorBio ? (
            <p className={styles.bio}>{authorBio}</p>
          ) : (
            <p className={styles.bio}>Untold yazarı</p>
          )}
          {sharedCat && (
            <span className={styles.connectionBadge}>Bağlantın · {sharedCat}</span>
          )}
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
