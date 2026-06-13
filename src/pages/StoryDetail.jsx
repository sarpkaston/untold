import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { mapSupabaseStory, getInitials } from "../lib/storyUtils";
import { useApp } from "../context/AppContext";
import StoryMenu from "../components/StoryMenu";
import styles from "./StoryDetail.module.css";

const isUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(String(id));

export default function StoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLiked, toggleLike, isOnShelf, toggleShelf, user, isReported } = useApp();

  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);
  const [comments, setComments] = useState([]);
  const [related, setRelated] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [profile, setProfile] = useState(null);

  // Profiles tablosundan yazar bilgisi çek
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const authorName = profile?.full_name
    || user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "Kullanıcı";
  const authorInitials = getInitials(authorName);

  useEffect(() => {
    if (!isUUID(id)) { setLoading(false); return; }

    supabase
      .from("stories")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (data && !error) setStory(mapSupabaseStory(data));
        setLoading(false);
      });

    supabase
      .from("story_comments")
      .select("*")
      .eq("story_id", id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setComments(data.map((c) => ({
            id: c.id,
            author: c.author_name,
            authorAvatar: c.author_avatar || getInitials(c.author_name),
            text: c.content,
            date: new Date(c.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }),
          })));
        }
      });
  }, [id]);

  // Benzer hikayeler
  useEffect(() => {
    if (!story) return;
    supabase
      .from("stories")
      .select("*")
      .eq("published", true)
      .eq("category", story.category)
      .neq("id", story.id)
      .order("likes", { ascending: false })
      .limit(3)
      .then(({ data }) => setRelated((data || []).map(mapSupabaseStory)));
  }, [story?.id]);

  // Görüntülemeyi kaydet
  useEffect(() => {
    if (!user || !isUUID(id)) return;
    supabase.from("story_views")
      .insert({ user_id: user.id, story_id: id })
      .then(() => {});
  }, [id, user]);

  const liked = story ? isLiked(story.id) : false;
  const onShelf = story ? isOnShelf(story.id) : false;

  function fireToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  function handleShelf() {
    toggleShelf(story.id);
    fireToast(onShelf ? "Raftan çıkarıldı" : "Rafına eklendi!");
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !user || !isUUID(id) || submitting) return;
    setSubmitting(true);
    setCommentError("");

    const { data, error } = await supabase
      .from("story_comments")
      .insert({
        user_id: user.id,
        story_id: id,
        author_name: authorName,
        author_avatar: profile?.avatar_url || authorInitials,
        content: commentText.trim(),
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      console.error("[story_comments insert]", error.code, error.message, error.details);
      setCommentError("Yorum gönderilemedi: " + error.message);
      return;
    }

    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        author: data.author_name,
        authorAvatar: data.author_avatar,
        text: data.content,
        date: "Az önce",
      },
    ]);
    setCommentText("");
  }

  if (loading) {
    return (
      <div className={styles.notFound} style={{ justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--terracotta)", opacity: 0.5,
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className={styles.notFound}>
        <h2>Hikaye bulunamadı.</h2>
        <Link to="/">Ana sayfaya dön</Link>
      </div>
    );
  }

  const chapter = story.chaptersContent[activeChapter] ?? story.chaptersContent[0];

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Top bar */}
      <div className={styles.topBar}>
        <Link to="/" className={styles.back}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <span className={styles.topCategory}>{story.category}</span>
        <div className={styles.topActions}>
          <button
            className={`${styles.shelfBtn} ${onShelf ? styles.shelfBtnActive : ""}`}
            onClick={handleShelf}
          >
            <ShelfIcon />
            {onShelf ? "Rafımda" : "Rafıma Al"}
          </button>
          <button
            className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
            onClick={() => toggleLike(story.id)}
          >
            <HeartIcon filled={liked} />
            {story.likes + (liked ? 1 : 0)}
          </button>
          <StoryMenu
            storyId={story.id}
            authorUserId={story.userId}
            authorName={story.isAnonymous ? "Anonim Yazar" : story.author}
            storyTitle={story.title}
            onBlock={() => navigate("/")}
            triggerClass={styles.menuTrigger}
          />
        </div>
      </div>

      {/* Book cover */}
      <div className={styles.cover} style={{ background: story.coverColor }}>
        <div className={styles.coverGrain} />
        <div className={styles.coverLines} />
        <div className={styles.coverSpine} />
        <div className={styles.coverContent}>
          <p className={styles.coverCat}>{story.category}</p>
          <h1 className={styles.coverTitle}>{story.title}</h1>
          <p className={styles.coverSub}>{story.subtitle}</p>
          <div className={styles.coverAuthor}>
            <div className={styles.coverAvatar}>{story.authorAvatar}</div>
            {story.isAnonymous || !story.userId ? (
              <span>{story.author}</span>
            ) : (
              <span
                className={styles.coverAuthorLink}
                onClick={() => navigate(`/kullanici/${story.userId}`)}
              >
                {story.author}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className={styles.metaRow}>
        <span className={styles.metaItem}>📖 {story.readTime}</span>
        <span className={styles.metaItem}>📚 {story.chapters} bölüm</span>
        <span className={styles.metaItem}>📅 {story.date}</span>
      </div>

      {/* Chapter nav */}
      <div className={styles.chapterNav}>
        {story.chaptersContent.map((ch, i) => (
          <button
            key={i}
            className={`${styles.chapterBtn} ${activeChapter === i ? styles.chapterActive : ""}`}
            onClick={() => setActiveChapter(i)}
          >
            <span className={styles.chNum}>{ch.number}</span>
            <span className={styles.chTitle}>{ch.title}</span>
          </button>
        ))}
      </div>

      {/* Reader */}
      <div className={styles.reader} style={{ position: "relative" }}>
        {isReported(story.id) && (
          <div className={styles.reportedReaderOverlay}>
            <span className={styles.reportedReaderIcon}>✓</span>
            <p className={styles.reportedReaderText}>Bu hikayeyi şikayet ettiniz</p>
            <p className={styles.reportedReaderSub}>İncelenene kadar içerik gizlendi</p>
          </div>
        )}
        <div className={isReported(story.id) ? styles.readerBlurred : undefined}>
        <div className={styles.chapterHeader}>
          <span className={styles.chapterLabel}>Bölüm {chapter.number}</span>
          <h2 className={styles.chapterHeading}>{chapter.title}</h2>
        </div>
        <div className={styles.chapterBody}>
          {chapter.content.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className={styles.pageNav}>
          {activeChapter > 0 && (
            <button className={styles.navBtn} onClick={() => setActiveChapter((v) => v - 1)}>
              ← Önceki
            </button>
          )}
          {activeChapter < story.chaptersContent.length - 1 && (
            <button
              className={`${styles.navBtn} ${styles.navNext}`}
              onClick={() => setActiveChapter((v) => v + 1)}
            >
              Sonraki →
            </button>
          )}
        </div>
        </div>{/* /readerBlurred */}
      </div>

      {/* Related (static only) */}
      {related.length > 0 && (
        <div className={styles.related}>
          <h3 className={styles.relatedTitle}>Benzer Hikayeler</h3>
          <div className={styles.relatedList}>
            {related.map((s) => (
              <Link to={`/hikaye/${s.id}`} key={s.id} className={styles.relatedCard}>
                <div className={styles.relatedCover} style={{ background: s.coverColor }} />
                <div className={styles.relatedBody}>
                  <p className={styles.relatedCat}>{s.category}</p>
                  <h4 className={styles.relatedName}>{s.title}</h4>
                  <p className={styles.relatedAuthor}>{s.author}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className={styles.comments}>
        <h3 className={styles.commentsTitle}>
          Yorumlar
          <span className={styles.commentCount}>{comments.length}</span>
        </h3>

        <form className={styles.commentForm} onSubmit={submitComment}>
          <div className={styles.commentInputRow}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className={styles.commentAvatar} alt="" style={{ objectFit: "cover" }} />
            ) : (
              <div className={styles.commentAvatar}>{authorInitials}</div>
            )}
            <input
              className={styles.commentInput}
              placeholder="Bir şey söylemek ister misin?"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={300}
            />
          </div>
          {commentText && (
            <div className={styles.commentActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => { setCommentText(""); setCommentError(""); }}>İptal</button>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Gönderiliyor…" : "Gönder"}
              </button>
            </div>
          )}
          {commentError && (
            <p style={{ fontSize: 13, color: "#c0392b", margin: "8px 0 0", padding: "8px 12px", background: "#fef2f2", borderRadius: 8 }}>
              {commentError}
            </p>
          )}
        </form>

        <div className={styles.commentList}>
          {comments.length === 0 && (
            <p className={styles.noComments}>Henüz yorum yok. İlk yorumu sen yap!</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className={styles.comment}>
              {c.authorAvatar?.startsWith("http") ? (
                <img src={c.authorAvatar} className={styles.commentAvatarSmall} alt="" style={{ objectFit: "cover" }} />
              ) : (
                <div className={styles.commentAvatarSmall}>{c.authorAvatar}</div>
              )}
              <div className={styles.commentContent}>
                <div className={styles.commentMeta}>
                  <span className={styles.commentAuthor}>{c.author}</span>
                  <span className={styles.commentDate}>{c.date}</span>
                </div>
                <p className={styles.commentText}>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ShelfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="4" width="4" height="16" rx="1"/>
      <rect x="8" y="6" width="4" height="14" rx="1"/>
      <rect x="14" y="3" width="4" height="17" rx="1"/>
      <line x1="2" y1="21" x2="20" y2="21"/>
    </svg>
  );
}
