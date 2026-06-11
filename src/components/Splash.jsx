import { useEffect, useState } from "react";
import styles from "./Splash.module.css";

export default function Splash({ onDone }) {
  const [phase, setPhase] = useState("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("exit"), 2400);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`${styles.splash} ${phase === "exit" ? styles.exit : ""}`}>
      <div className={styles.bg} />
      <div className={styles.shimmer} />
      <div className={styles.content}>
        <div className={styles.bookIcon}>
          <div className={styles.bookPage} />
          <div className={styles.bookPage} />
          <div className={styles.bookPage} />
        </div>
        <h1 className={styles.logo}>Untold</h1>
        <p className={`${styles.slogan} ${styles.sloganGlow}`}>Her insan bir kitaptır.</p>
        <div className={styles.dots}>
          <span className={styles.dot} style={{ animationDelay: "0ms" }} />
          <span className={styles.dot} style={{ animationDelay: "200ms" }} />
          <span className={styles.dot} style={{ animationDelay: "400ms" }} />
        </div>
      </div>
      <p className={styles.sub}>anlatılmamış hikayeler</p>
    </div>
  );
}
