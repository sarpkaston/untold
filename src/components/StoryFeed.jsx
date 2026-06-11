import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import styles from "./StoryFeed.module.css";

export default function StoryFeed({ stories }) {
  return (
    <div className={styles.feed}>
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  );
}

function StoryCard({ story }) {
  const {
    isLiked, toggleLike,
    isOnShelf, toggleShelf,
    isBookmarked, toggleBookmark,
    isConnected, toggleConnection,
  } = useApp();

  const [commentOpen, setCommentOpen] = useState(false);
  const [toast, setToast] = useState(null);

  function fire(label, action) {
    action();
    setToast(label);
    setTimeout(() => setToast(null), 1800);
  }

  const liked = isLiked(story.id);
  const onShelf = isOnShelf(story.id);
  const bookmarked = isBookmarked(story.id);
  const connected = isConnected(story.id);

  return (
    <article className={styles.card}>
      {/* Toast notification */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Cover */}
      <Link to={`/hikaye/${story.id}`} className={styles.coverLink}>
        <div className={styles.cover} style={{ background: story.coverColor }}>
          <div className={styles.coverGrain} />
          <div className={styles.coverLines} />
          <div className={styles.spine} />

          <div className={styles.coverContent}>
            <span className={styles.coverCat}>{story.category}</span>
            <h3 className={styles.coverTitle}>{story.title}</h3>
            <p className={styles.coverSub}>{story.subtitle}</p>
          </div>

          <button
            className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ""}`}
            onClick={(e) => { e.preventDefault(); toggleLike(story.id); }}
          >
            <HeartIcon filled={liked} />
            <span>{story.likes + (liked ? 1 : 0)}</span>
          </button>

          <span className={styles.chapterBadge}>{story.chapters} Bölüm</span>
        </div>
      </Link>

      {/* Author + meta */}
      <div className={styles.meta}>
        <div className={styles.avatar}>{story.authorAvatar}</div>
        <div className={styles.metaText}>
          {story.isAnonymous || !story.userId ? (
            <p className={styles.authorName}>{story.author}</p>
          ) : (
            <Link to={`/kullanici/${story.userId}`} className={styles.authorLink}>
              {story.author}
            </Link>
          )}
          <p className={styles.metaDetail}>{story.readTime} · {story.date}</p>
        </div>
        <span className={styles.catTag}>{story.category}</span>
      </div>

      {/* Preview */}
      <p className={styles.preview}>{story.preview}</p>

      {/* Interaction buttons */}
      <div className={styles.actions}>
        <ActionBtn
          icon={<ShelfIcon />}
          label="Rafıma Al"
          active={onShelf}
          onClick={() => fire(onShelf ? "Raftan çıkarıldı" : "Rafına eklendi!", () => toggleShelf(story.id))}
        />
        <ActionBtn
          icon={<BookmarkIcon />}
          label="Yer İmi"
          active={bookmarked}
          onClick={() => fire(bookmarked ? "Yer imi kaldırıldı" : "Yer imi eklendi ✓", () => toggleBookmark(story.id))}
        />
        <ActionBtn
          icon={<ConnectIcon />}
          label="Bağlantı"
          active={connected}
          onClick={() => fire(connected ? "İstek geri alındı" : "Bağlantı isteği gönderildi ✓", () => toggleConnection(story.id))}
        />
        <ActionBtn
          icon={<CommentIcon />}
          label={`Yorum ${story.comments.length > 0 ? `(${story.comments.length})` : ""}`}
          active={commentOpen}
          onClick={() => setCommentOpen((v) => !v)}
        />
      </div>

      {/* Inline comment box */}
      {commentOpen && <InlineComments story={story} onClose={() => setCommentOpen(false)} />}

      {/* Read link */}
      <Link to={`/hikaye/${story.id}`} className={styles.readBtn}>
        Okumaya Başla →
      </Link>
    </article>
  );
}

function ActionBtn({ icon, label, active, onClick }) {
  return (
    <button
      className={`${styles.actionBtn} ${active ? styles.actionBtnActive : ""}`}
      onClick={onClick}
    >
      <span className={styles.actionIcon}>{icon}</span>
      <span className={styles.actionLabel}>{label}</span>
    </button>
  );
}

function InlineComments({ story, onClose }) {
  const [list, setList] = useState(story.comments);
  const [text, setText] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setList((p) => [...p, { id: Date.now(), author: "Sen", authorAvatar: "SN", text: text.trim(), date: "Az önce" }]);
    setText("");
  }

  return (
    <div className={styles.commentsBox}>
      <div className={styles.commentsHeader}>
        <span className={styles.commentsTitle}>Yorumlar</span>
        <button className={styles.commentsClose} onClick={onClose}>✕</button>
      </div>

      <div className={styles.commentsList}>
        {list.length === 0 && (
          <p className={styles.noComments}>İlk yorumu sen yaz!</p>
        )}
        {list.map((c) => (
          <div key={c.id} className={styles.commentRow}>
            <span className={styles.commentAv}>{c.authorAvatar}</span>
            <div className={styles.commentBubble}>
              <span className={styles.commentAuthor}>{c.author}</span>
              <span className={styles.commentDate}>{c.date}</span>
              <p className={styles.commentText}>{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      <form className={styles.commentForm} onSubmit={submit}>
        <input
          className={styles.commentInput}
          placeholder="Yorum yaz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
        />
        <button type="submit" className={styles.commentSend} disabled={!text.trim()}>
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

/* ── Icons ──────────────────────────────────── */
function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function ShelfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="4" width="4" height="16" rx="1"/>
      <rect x="8" y="6" width="4" height="14" rx="1"/>
      <rect x="14" y="3" width="4" height="17" rx="1"/>
      <line x1="2" y1="21" x2="20" y2="21"/>
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}
