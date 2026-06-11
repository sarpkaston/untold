import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Room, RoomEvent, Track } from "livekit-client";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { getInitials } from "../lib/storyUtils";
import styles from "./LiveStream.module.css";

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL;

async function getToken(room, identity, role) {
  const res = await fetch(
    `/api/livekit/token?room=${encodeURIComponent(room)}&identity=${encodeURIComponent(identity)}&role=${role}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Token alınamadı");
  return data.token;
}

export default function LiveStream() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const { user } = useApp();

  const [phase, setPhase]           = useState("loading"); // loading | live | ended | error
  const [session, setSession]       = useState(null);
  const [isHost, setIsHost]         = useState(false);
  const [error, setError]           = useState("");
  const [count, setCount]           = useState(1);
  const [questions, setQuestions]   = useState([]);
  const [qInput, setQInput]         = useState("");
  const [isMicOn, setIsMicOn]       = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const roomRef           = useRef(null);
  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const pendingTrackRef   = useRef(null); // remote track received before DOM ready

  // Attach local video once DOM element is available
  const attachLocalVideo = useCallback(() => {
    const r = roomRef.current;
    if (!r || !localVideoRef.current) return;
    const pub = r.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub?.track) pub.track.attach(localVideoRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Fetch session
        const { data, error: err } = await supabase
          .from("live_sessions")
          .select("*")
          .eq("room_name", roomName)
          .single();

        if (err || !data) throw new Error("Canlı yayın bulunamadı.");
        if (cancelled) return;

        setSession(data);

        if (!data.is_active) {
          setPhase("ended");
          return;
        }

        const hostMode = !!user && user.id === data.host_id;
        setIsHost(hostMode);

        // 2. Get token
        const identity = user
          ? user.id
          : "izleyici-" + Math.random().toString(36).slice(2, 7);
        const token = await getToken(roomName, identity, hostMode ? "host" : "viewer");
        if (cancelled) return;

        // 3. Build Room
        const r = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = r;

        // Participant count
        const updateCount = () => {
          if (!cancelled) setCount(r.remoteParticipants.size + 1);
        };
        r.on(RoomEvent.ParticipantConnected, updateCount);
        r.on(RoomEvent.ParticipantDisconnected, updateCount);

        // Q&A messages
        r.on(RoomEvent.DataReceived, (payload) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(payload));
            if (msg.type === "question" && !cancelled) {
              setQuestions((prev) => [...prev, msg]);
            }
          } catch (_) {}
        });

        // Remote tracks (viewer)
        if (!hostMode) {
          r.on(RoomEvent.TrackSubscribed, (track) => {
            if (track.source === Track.Source.Camera) {
              if (remoteVideoRef.current) {
                track.attach(remoteVideoRef.current);
              } else {
                pendingTrackRef.current = track; // attach after render
              }
            }
            if (track.source === Track.Source.Microphone) {
              track.attach(); // auto-creates audio element
            }
          });
          r.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());
        }

        // 4. Connect
        await r.connect(LIVEKIT_URL, token);
        if (cancelled) { r.disconnect(); return; }

        // 5. Host: publish camera + mic
        if (hostMode) {
          await r.localParticipant.enableCameraAndMicrophone();
        }

        setCount(r.remoteParticipants.size + 1);
        setPhase("live");

        // Update viewer count in Supabase (non-critical)
        supabase
          .from("live_sessions")
          .update({ viewer_count: r.remoteParticipants.size })
          .eq("room_name", roomName)
          .then(() => {});

      } catch (e) {
        if (!cancelled) { setError(e.message); setPhase("error"); }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomName, user]);

  // Attach local video after React renders the <video> element
  useEffect(() => {
    if (phase === "live" && isHost) {
      const t = setTimeout(attachLocalVideo, 120);
      return () => clearTimeout(t);
    }
  }, [phase, isHost, attachLocalVideo]);

  // Attach pending remote track after render
  useEffect(() => {
    if (phase === "live" && !isHost && pendingTrackRef.current && remoteVideoRef.current) {
      pendingTrackRef.current.attach(remoteVideoRef.current);
      pendingTrackRef.current = null;
    }
  }, [phase, isHost]);

  // ── Controls ─────────────────────────────────────

  async function toggleMic() {
    const r = roomRef.current;
    if (!r) return;
    const next = !isMicOn;
    await r.localParticipant.setMicrophoneEnabled(next);
    setIsMicOn(next);
  }

  async function toggleCamera() {
    const r = roomRef.current;
    if (!r) return;
    const next = !isCameraOn;
    await r.localParticipant.setCameraEnabled(next);
    setIsCameraOn(next);
    if (next) setTimeout(attachLocalVideo, 150);
  }

  async function endStream() {
    if (roomRef.current) roomRef.current.disconnect();
    await supabase
      .from("live_sessions")
      .update({ is_active: false })
      .eq("room_name", roomName);
    navigate("/profil");
  }

  async function sendQuestion(e) {
    e.preventDefault();
    const text = qInput.trim();
    const r = roomRef.current;
    if (!text || !r) return;

    const from =
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "İzleyici";

    const msg = { type: "question", text, from, ts: Date.now() };

    try {
      await r.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(msg)),
        { reliable: true }
      );
    } catch (_) {}

    setQuestions((prev) => [...prev, msg]);
    setQInput("");
  }

  // ── Render states ────────────────────────────────

  if (phase === "loading") {
    return (
      <div className={styles.centered}>
        <div className={styles.dots}><span /><span /><span /></div>
        <p className={styles.centeredLabel}>Bağlanılıyor…</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className={styles.centered}>
        <p className={styles.errorMsg}>{error}</p>
        <button className={styles.ghostBtn} onClick={() => navigate("/eslesmeler")}>
          Geri Dön
        </button>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className={styles.centered}>
        <span className={styles.endedIcon}>📺</span>
        <p className={styles.endedMsg}>Bu yayın sona erdi.</p>
        <button className={styles.ghostBtn} onClick={() => navigate("/eslesmeler")}>
          Bağlan Sayfasına Dön
        </button>
      </div>
    );
  }

  // ── Live ─────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Top bar ──────────────────────────────── */}
      <div className={styles.topBar}>
        <button className={styles.topBack} onClick={() => navigate(-1)}>
          <ChevronIcon />
        </button>
        <div className={styles.topMid}>
          <div className={styles.livePill}>
            <span className={styles.liveDot} />
            CANLI
          </div>
          <p className={styles.topTitle}>{session?.title}</p>
        </div>
        <div className={styles.countBadge}>
          <EyeIcon />
          <span>{count}</span>
        </div>
      </div>

      {/* ── Video ────────────────────────────────── */}
      <div className={styles.videoWrap}>
        {isHost ? (
          <video
            ref={localVideoRef}
            className={styles.video}
            autoPlay
            muted
            playsInline
          />
        ) : (
          <video
            ref={remoteVideoRef}
            className={styles.video}
            autoPlay
            playsInline
          />
        )}

        {/* Camera-off placeholder */}
        {isHost && !isCameraOn && (
          <div className={styles.camOff}>
            <div className={styles.camOffAvatar}>
              {getInitials(session?.host_name || "?")}
            </div>
            <p>Kamera kapalı</p>
          </div>
        )}

        {/* Host info overlay for viewers */}
        {!isHost && (
          <div className={styles.hostOverlay}>
            <span className={styles.hostAv}>{session?.host_avatar}</span>
            <span className={styles.hostName}>{session?.host_name}</span>
          </div>
        )}
      </div>

      {/* ── Host controls ────────────────────────── */}
      {isHost && (
        <div className={styles.controls}>
          <button
            className={`${styles.ctrlBtn} ${!isMicOn ? styles.ctrlOff : ""}`}
            onClick={toggleMic}
          >
            {isMicOn ? <MicIcon /> : <MicOffIcon />}
            <span>{isMicOn ? "Mikrofon" : "Sessiz"}</span>
          </button>

          <button
            className={`${styles.ctrlBtn} ${!isCameraOn ? styles.ctrlOff : ""}`}
            onClick={toggleCamera}
          >
            {isCameraOn ? <CamIcon /> : <CamOffIcon />}
            <span>{isCameraOn ? "Kamera" : "Kapalı"}</span>
          </button>

          <button className={styles.endBtn} onClick={endStream}>
            <EndIcon />
            <span>Bitir</span>
          </button>
        </div>
      )}

      {/* ── Q&A ──────────────────────────────────── */}
      <div className={styles.qa}>
        <div className={styles.qaHeader}>
          <span className={styles.qaTitle}>Sorular</span>
          {questions.length > 0 && (
            <span className={styles.qaCount}>{questions.length}</span>
          )}
        </div>

        <div className={styles.qaList}>
          {questions.length === 0 && (
            <p className={styles.qaEmpty}>
              {isHost ? "Henüz soru gelmedi." : "Bir soru sor!"}
            </p>
          )}
          {questions.map((q, i) => (
            <div key={i} className={styles.qaItem}>
              <div className={styles.qaAv}>{getInitials(q.from)}</div>
              <div className={styles.qaBody}>
                <span className={styles.qaFrom}>{q.from}</span>
                <p className={styles.qaText}>{q.text}</p>
              </div>
            </div>
          ))}
        </div>

        {!isHost && (
          <form className={styles.qaForm} onSubmit={sendQuestion}>
            <input
              className={styles.qaInput}
              placeholder="Soru sor…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              maxLength={200}
            />
            <button
              type="submit"
              className={styles.qaSendBtn}
              disabled={!qInput.trim()}
            >
              <SendIcon />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Icons ──────────────────────────────────────── */
function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}
function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}
function CamIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  );
}
function CamOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h3a2 2 0 0 1 2 2v9.34"/>
      <polygon points="23 7 16 12 23 17 23 7"/>
    </svg>
  );
}
function EndIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6"/>
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}
