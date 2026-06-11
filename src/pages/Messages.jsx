import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { getInitials } from "../lib/storyUtils";
import styles from "./Messages.module.css";

export default function Messages() {
  const { user } = useApp();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  async function fetchConversations() {
    setLoading(true);

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) { setLoading(false); return; }

    const convMap = {};
    data.forEach((msg) => {
      const partnerId = msg.from_user_id === user.id ? msg.to_user_id : msg.from_user_id;
      if (!convMap[partnerId]) {
        convMap[partnerId] = { partnerId, lastMessage: msg, unread: 0 };
      }
      if (msg.to_user_id === user.id && !msg.read) {
        convMap[partnerId].unread++;
      }
    });

    const partnerIds = Object.keys(convMap);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", partnerIds);

    const profileMap = {};
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });

    const convList = Object.values(convMap)
      .map((conv) => ({
        ...conv,
        profile: profileMap[conv.partnerId] || { full_name: "Kullanıcı" },
      }))
      .sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));

    setConversations(convList);
    setLoading(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate("/profil")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>Mesajlar</h1>
      </div>

      {loading ? (
        <div className={styles.loading}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={styles.dot} style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>💬</span>
          <p className={styles.emptyTitle}>Henüz mesajın yok</p>
          <p className={styles.emptyDesc}>Bağlantı kurarak sohbet başlatabilirsin.</p>
          <Link to="/eslesmeler" className={styles.emptyBtn}>Bağlan</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {conversations.map((conv) => {
            const name = conv.profile.full_name || "Kullanıcı";
            const initials = getInitials(name);
            const isMine = conv.lastMessage.from_user_id === user.id;
            const preview = conv.lastMessage.content;
            const time = new Date(conv.lastMessage.created_at).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <button
                key={conv.partnerId}
                className={styles.convRow}
                onClick={() => navigate(`/mesajlar/${conv.partnerId}`)}
              >
                {conv.profile.avatar_url ? (
                  <img src={conv.profile.avatar_url} className={styles.convAvatar} alt={name} />
                ) : (
                  <div className={styles.convAvatar}>{initials}</div>
                )}
                <div className={styles.convBody}>
                  <div className={styles.convTop}>
                    <span className={styles.convName}>{name}</span>
                    <span className={styles.convTime}>{time}</span>
                  </div>
                  <div className={styles.convBottom}>
                    <span className={`${styles.convPreview} ${conv.unread > 0 ? styles.convUnread : ""}`}>
                      {isMine ? "Sen: " : ""}{preview.length > 45 ? preview.slice(0, 45) + "…" : preview}
                    </span>
                    {conv.unread > 0 && <span className={styles.convBadge}>{conv.unread}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
