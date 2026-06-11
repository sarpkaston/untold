import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import styles from "./SwipeDeck.module.css";

const THRESHOLD = 80;

export default function SwipeDeck({ stories }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [flyDir, setFlyDir] = useState(null);
  const startRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const cardRef = useRef(null);
  const { toggleLike } = useApp();

  // Prevent scroll while swiping
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const prevent = (e) => { if (draggingRef.current) e.preventDefault(); };
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => el.removeEventListener("touchmove", prevent);
  });

  function onStart(clientX, clientY) {
    startRef.current = { x: clientX, y: clientY };
    draggingRef.current = true;
    setDragging(true);
  }

  function onMove(clientX, clientY) {
    if (!draggingRef.current) return;
    setDrag({
      x: clientX - startRef.current.x,
      y: clientY - startRef.current.y,
    });
  }

  function onEnd() {
    draggingRef.current = false;
    setDragging(false);
    if (Math.abs(drag.x) >= THRESHOLD) {
      flyOff(drag.x > 0 ? "right" : "left");
    } else {
      setDrag({ x: 0, y: 0 });
    }
  }

  function flyOff(dir) {
    setFlyDir(dir);
    if (dir === "right" && stories[index]) {
      toggleLike(stories[index].id);
    }
    setTimeout(() => {
      setIndex((i) => i + 1);
      setDrag({ x: 0, y: 0 });
      setFlyDir(null);
    }, 380);
  }

  if (index >= stories.length) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📚</span>
        <p className={styles.emptyText}>Tüm hikayeleri gördün!</p>
        <p className={styles.emptySubtext}>Eşleşmelerine göz at.</p>
        <button className={styles.restartBtn} onClick={() => setIndex(0)}>
          Tekrar Başla
        </button>
      </div>
    );
  }

  const current = stories[index];
  const rotation = drag.x * 0.04;
  const fadeOpacity = Math.max(0.7, 1 - Math.abs(drag.x) / 350);

  let transform;
  if (flyDir === "right") transform = "translate(130%, -30px) rotate(22deg)";
  else if (flyDir === "left") transform = "translate(-130%, -30px) rotate(-22deg)";
  else transform = `translate(${drag.x}px, ${drag.y * 0.3}px) rotate(${rotation}deg)`;

  const showLike = drag.x > 20 || flyDir === "right";
  const showNope = drag.x < -20 || flyDir === "left";

  return (
    <div className={styles.deck}>
      {/* Background cards */}
      {[2, 1].map((offset) => {
        const bg = stories[index + offset];
        if (!bg) return null;
        return (
          <div
            key={bg.id}
            className={styles.bgCard}
            style={{
              background: bg.coverColor,
              transform: `scale(${1 - offset * 0.05}) translateY(${offset * 14}px)`,
              zIndex: 10 - offset,
            }}
          />
        );
      })}

      {/* Active card */}
      <div
        ref={cardRef}
        className={`${styles.card} ${dragging ? styles.dragging : ""} ${flyDir ? styles.flying : ""}`}
        style={{ transform, opacity: flyDir ? 0.6 : fadeOpacity, zIndex: 20 }}
        onMouseDown={(e) => onStart(e.clientX, e.clientY)}
        onMouseMove={(e) => { if (dragging) onMove(e.clientX, e.clientY); }}
        onMouseUp={onEnd}
        onMouseLeave={() => { if (dragging) onEnd(); }}
        onTouchStart={(e) => { const t = e.touches[0]; onStart(t.clientX, t.clientY); }}
        onTouchMove={(e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); }}
        onTouchEnd={onEnd}
      >
        {showLike && (
          <div className={`${styles.badge} ${styles.badgeLike}`}>
            <span>❤</span> BEĞENDİM
          </div>
        )}
        {showNope && (
          <div className={`${styles.badge} ${styles.badgeNope}`}>
            ✕ GEÇ
          </div>
        )}

        <div className={styles.cover} style={{ background: current.coverColor }}>
          <div className={styles.coverGrain} />
          <div className={styles.coverLines} />
          <div className={styles.spine} style={{ background: current.coverColor }} />
          <div className={styles.coverContent}>
            <span className={styles.coverCat}>{current.category}</span>
            <h2 className={styles.coverTitle}>{current.title}</h2>
            <p className={styles.coverSub}>{current.subtitle}</p>
          </div>
          <div className={styles.pageCount}>{current.chapters} Bölüm</div>
        </div>

        <div className={styles.body}>
          <div className={styles.author}>
            <div className={styles.avatar}>{current.authorAvatar}</div>
            <div>
              <p className={styles.authorName}>{current.author}</p>
              <p className={styles.authorMeta}>{current.readTime} okuma</p>
            </div>
          </div>
          <p className={styles.preview}>{current.preview}</p>
          <Link
            to={`/hikaye/${current.id}`}
            className={styles.readBtn}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Okumaya Başla →
          </Link>
        </div>
      </div>

      {/* Buttons */}
      <div className={styles.actions}>
        <button className={`${styles.actionBtn} ${styles.nopeBtn}`} onClick={() => flyOff("left")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.progress}>
          <span className={styles.progressText}>{index + 1} / {stories.length}</span>
        </div>

        <button className={`${styles.actionBtn} ${styles.likeBtn}`} onClick={() => flyOff("right")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
