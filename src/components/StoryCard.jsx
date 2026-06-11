import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import styles from "./StoryCard.module.css";

export default function StoryCard({ story }) {
  const { isLiked, toggleLike } = useApp();
  const navigate = useNavigate();
  const liked = isLiked(story.id);

  function handleLike(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(story.id);
  }

  return (
    <Link to={`/hikaye/${story.id}`} className={styles.card}>
      <div className={styles.cover} style={{ background: story.coverColor }}>
        <div className={styles.coverLines} />
        <div className={styles.coverTitle}>
          <p className={styles.coverCategory}>{story.category}</p>
          <h3 className={styles.coverHeading}>{story.title}</h3>
        </div>
        <div className={styles.spine} style={{ background: story.coverColor }} />

        <button
          className={`${styles.likeBtn} ${liked ? styles.liked : ""}`}
          onClick={handleLike}
          aria-label={liked ? "Beğeniyi kaldır" : "Beğen"}
        >
          <HeartIcon filled={liked} />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.category}>{story.category}</span>
          <span className={styles.readTime}>{story.readTime}</span>
        </div>

        <h3 className={styles.title}>{story.title}</h3>
        <p className={styles.subtitle}>{story.subtitle}</p>
        <p className={styles.preview}>{story.preview}</p>

        <div className={styles.footer}>
          <div className={styles.author}>
            <div className={styles.avatar}>{story.authorAvatar}</div>
            {story.isAnonymous || !story.userId ? (
              <span className={styles.authorName}>{story.author}</span>
            ) : (
              <span
                className={styles.authorLink}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/kullanici/${story.userId}`); }}
              >
                {story.author}
              </span>
            )}
          </div>
          <div className={styles.stats}>
            <span className={`${styles.stat} ${liked ? styles.statLiked : ""}`}>
              <HeartIcon filled={liked} />
              {story.likes + (liked ? 1 : 0)}
            </span>
            <span className={styles.stat}>
              <BookIcon />
              {story.chapters}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
