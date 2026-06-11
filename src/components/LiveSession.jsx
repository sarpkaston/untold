import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import styles from "./LiveSession.module.css";

export default function LiveSession() {
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchLive() {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("is_active", true)
        .order("started_at", { ascending: false })
        .limit(1);
      setSession(data?.[0] || null);
    }

    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!session) return null;

  return (
    <button className={styles.banner} onClick={() => navigate(`/canli/${session.room_name}`)}>
      <div className={styles.bannerLeft}>
        <span className={styles.liveDot} />
        <span className={styles.liveLabel}>CANLI</span>
        <div className={styles.bannerInfo}>
          <p className={styles.bannerAuthor}>{session.host_name}</p>
          <p className={styles.bannerTitle}>{session.title}</p>
        </div>
      </div>
      <div className={styles.bannerRight}>
        <span className={styles.viewers}>
          <EyeIcon /> {session.viewer_count || 0}
        </span>
        <span className={styles.joinBtn}>Katıl</span>
      </div>
    </button>
  );
}

function EyeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
