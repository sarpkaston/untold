import { useState } from "react";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import styles from "./StoryMenu.module.css";

const REASONS = ["Spam", "Uygunsuz içerik", "Yanıltıcı", "Diğer"];

export default function StoryMenu({ storyId, authorUserId, authorName, storyTitle, onBlock, triggerClass }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("menu"); // menu | report | done | blocked
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Kendi hikayelerinde menü gösterme
  if (!user || user.id === authorUserId) return null;

  async function submitReport() {
    if (!reason || submitting) return;
    setSubmitting(true);
    await supabase.from("story_reports").upsert(
      { user_id: user.id, story_id: storyId, reason },
      { onConflict: "user_id,story_id" }
    );
    setSubmitting(false);
    setStep("done");
  }

  async function blockContent() {
    await supabase.from("blocked_stories").upsert(
      { user_id: user.id, story_id: storyId, story_title: storyTitle || "" },
      { onConflict: "user_id,story_id" }
    );
    if (authorUserId) {
      await supabase.from("blocked_users").upsert(
        { user_id: user.id, blocked_user_id: authorUserId, blocked_user_name: authorName || "Anonim Yazar" },
        { onConflict: "user_id,blocked_user_id" }
      );
    }
    setStep("blocked");
    setTimeout(() => {
      close();
      onBlock?.(storyId, authorUserId);
    }, 1400);
  }

  function close() {
    setOpen(false);
    setTimeout(() => { setStep("menu"); setReason(""); }, 300);
  }

  return (
    <>
      <button
        className={`${styles.trigger} ${triggerClass || ""}`}
        onClick={() => setOpen(true)}
        aria-label="Seçenekler"
      >
        <DotsIcon />
      </button>

      {open && (
        <div className={styles.overlay} onClick={close}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />

            {step === "menu" && (
              <>
                <p className={styles.sheetTitle}>
                  {storyTitle ? `"${storyTitle.slice(0, 38)}${storyTitle.length > 38 ? "…" : ""}"` : "Seçenekler"}
                </p>
                <button className={styles.option} onClick={() => setStep("report")}>
                  <FlagIcon /> Şikayet Et
                </button>
                <button className={`${styles.option} ${styles.optionDanger}`} onClick={blockContent}>
                  <BlockIcon /> Bu içeriği bir daha gösterme
                </button>
                <button className={styles.cancelBtn} onClick={close}>İptal</button>
              </>
            )}

            {step === "report" && (
              <>
                <p className={styles.sheetTitle}>Şikayet sebebini seç</p>
                <div className={styles.reasons}>
                  {REASONS.map(r => (
                    <button
                      key={r}
                      className={`${styles.reasonBtn} ${reason === r ? styles.reasonSelected : ""}`}
                      onClick={() => setReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button className={styles.submitBtn} onClick={submitReport} disabled={!reason || submitting}>
                  {submitting ? "Gönderiliyor…" : "Gönder"}
                </button>
                <button className={styles.cancelBtn} onClick={() => setStep("menu")}>← Geri</button>
              </>
            )}

            {step === "done" && (
              <div className={styles.resultState}>
                <span>✅</span>
                <p>Bildiriminiz alındı.<br />Teşekkürler.</p>
                <button className={styles.cancelBtn} onClick={close}>Kapat</button>
              </div>
            )}

            {step === "blocked" && (
              <div className={styles.resultState}>
                <span>🚫</span>
                <p>Bu içerik artık<br />gösterilmeyecek.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
function BlockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
