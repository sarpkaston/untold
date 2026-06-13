import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { getInitials } from "../lib/storyUtils";
import styles from "./Thread.module.css";

export default function Thread() {
  const { userId: partnerId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, refreshUnreadCount } = useApp();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Anonim durum — URL param veya mesaj geçmişinden belirlenir
  const urlMyAnon = searchParams.get("myAnon") === "1";
  const urlPartnerAnon = searchParams.get("anon") === "1";

  const [myAnon, setMyAnon] = useState(urlMyAnon);
  const [partnerAnon, setPartnerAnon] = useState(urlPartnerAnon);
  const [myRevealed, setMyRevealed] = useState(false);
  const [partnerRevealed, setPartnerRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);

  const showMeAsAnon = myAnon && !myRevealed;
  const showPartnerAsAnon = partnerAnon && !partnerRevealed;

  useEffect(() => {
    if (!user || !partnerId) return;

    // Partner profili
    supabase.from("profiles").select("full_name, avatar_url")
      .eq("id", partnerId).single()
      .then(({ data }) => setPartner(data));

    // Kimlik açma durumlarını yükle
    supabase.from("thread_reveals").select("user_id, partner_id")
      .or(`and(user_id.eq.${user.id},partner_id.eq.${partnerId}),and(user_id.eq.${partnerId},partner_id.eq.${user.id})`)
      .then(({ data }) => {
        (data || []).forEach((r) => {
          if (r.user_id === user.id) setMyRevealed(true);
          if (r.user_id === partnerId) setPartnerRevealed(true);
        });
      });

    fetchMessages();

    // Gerçek zamanlı: yeni mesajlar
    const channel = supabase
      .channel(`thread-${[user.id, partnerId].sort().join("-")}`)
      .on("postgres_changes",
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
            supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => {
              refreshUnreadCount();
            });
          }
        }
      )
      // Gerçek zamanlı: kimlik açma
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "thread_reveals" },
        (payload) => {
          const r = payload.new;
          if (r.user_id === partnerId && r.partner_id === user.id) {
            setPartnerRevealed(true);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, partnerId]);

  // Mesaj geçmişinden anonim durumu çıkar
  useEffect(() => {
    if (messages.length === 0) return;
    if (!urlMyAnon) {
      const myAnonHist = messages.some(m => m.from_user_id === user?.id && m.sender_anonymous);
      if (myAnonHist) setMyAnon(true);
    }
    if (!urlPartnerAnon) {
      const partnerAnonHist = messages.some(m => m.from_user_id === partnerId && m.sender_anonymous);
      if (partnerAnonHist) setPartnerAnon(true);
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${partnerId}),and(from_user_id.eq.${partnerId},to_user_id.eq.${user.id})`)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    const unreadIds = (data || [])
      .filter((m) => m.to_user_id === user.id && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      supabase.from("messages").update({ read: true }).in("id", unreadIds).then(() => {
        refreshUnreadCount();
      });
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
      .insert({
        from_user_id: user.id,
        to_user_id: partnerId,
        content,
        sender_anonymous: showMeAsAnon,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
    } else if (error) {
      setText(content);
    }
    setSending(false);
  }

  async function revealIdentity() {
    if (revealing || myRevealed) return;
    setRevealing(true);
    await supabase.from("thread_reveals").insert({ user_id: user.id, partner_id: partnerId });
    setMyRevealed(true);
    setRevealing(false);
  }

  const partnerName = showPartnerAsAnon ? "Anonim" : (partner?.full_name || "Kullanıcı");
  const partnerInitials = showPartnerAsAnon ? "?" : getInitials(partnerName);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.partnerInfo}>
          {!showPartnerAsAnon && partner?.avatar_url ? (
            <img src={partner.avatar_url} className={styles.partnerAvatar} alt={partnerName} />
          ) : (
            <div className={styles.partnerAvatar}>{partnerInitials}</div>
          )}
          <div>
            <span className={styles.partnerName}>{partnerName}</span>
            {showPartnerAsAnon && partnerRevealed === false && (
              <span className={styles.partnerAnonTag}>Kimliğini gizliyor</span>
            )}
          </div>
        </div>
        {showMeAsAnon && (
          <button
            className={styles.revealBtn}
            onClick={revealIdentity}
            disabled={revealing}
          >
            {revealing ? "…" : "Kimliğini Açıkla"}
          </button>
        )}
      </div>

      {showMeAsAnon && (
        <div className={styles.anonBanner}>
          Anonim olarak mesajlaşıyorsun — karşı taraf seni "Anonim" olarak görüyor
        </div>
      )}

      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.emptyChat}>Sohbete başla! İlk mesajı sen at.</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.from_user_id === user?.id;
          const senderIsAnon = !isMine && msg.sender_anonymous && !partnerRevealed;
          return (
            <div
              key={msg.id}
              className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}`}
            >
              {senderIsAnon && <span className={styles.anonSenderTag}>Anonim</span>}
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
          placeholder={showMeAsAnon ? "Anonim mesaj yaz…" : "Mesaj yaz…"}
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
