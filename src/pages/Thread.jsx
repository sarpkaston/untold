import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { getInitials } from "../lib/storyUtils";
import styles from "./Thread.module.css";

export default function Thread() {
  const { userId: partnerId } = useParams();
  const { user } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user || !partnerId) return;

    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", partnerId)
      .single()
      .then(({ data }) => setPartner(data));

    fetchMessages();

    const channel = supabase
      .channel(`thread-${[user.id, partnerId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new;
          const belongs =
            (msg.from_user_id === user.id && msg.to_user_id === partnerId) ||
            (msg.from_user_id === partnerId && msg.to_user_id === user.id);
          if (!belongs) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.to_user_id === user.id) {
            supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => {});
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(from_user_id.eq.${user.id},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    setMessages(data || []);

    const unreadIds = (data || [])
      .filter((m) => m.to_user_id === user.id && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      supabase.from("messages").update({ read: true }).in("id", unreadIds).then(() => {});
    }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");

    const { data, error } = await supabase
      .from("messages")
      .insert({ from_user_id: user.id, to_user_id: partnerId, content })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    } else if (error) {
      setText(content);
    }
    setSending(false);
  }

  const partnerName = partner?.full_name || "Kullanıcı";
  const partnerInitials = getInitials(partnerName);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate("/profil")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.partnerInfo}>
          {partner?.avatar_url ? (
            <img src={partner.avatar_url} className={styles.partnerAvatar} alt={partnerName} />
          ) : (
            <div className={styles.partnerAvatar}>{partnerInitials}</div>
          )}
          <span className={styles.partnerName}>{partnerName}</span>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.emptyChat}>Sohbete başla! İlk mesajı sen at.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.from_user_id === user?.id;
          return (
            <div key={msg.id} className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}>
              <p className={styles.bubbleText}>{msg.content}</p>
              <span className={styles.bubbleTime}>
                {new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className={styles.inputRow} onSubmit={sendMessage}>
        <input
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz…"
          maxLength={500}
          autoComplete="off"
        />
        <button type="submit" className={styles.sendBtn} disabled={!text.trim() || sending}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
