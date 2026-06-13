import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import styles from "./Onboarding.module.css";

const ALL_INTERESTS = [
  "Aşk", "Aile", "Kariyer", "Sağlık", "Spor",
  "Psikoloji", "Müzik", "Edebiyat", "Girişimcilik", "Seyahat",
  "Yemek", "Teknoloji", "Sinema", "Oyun", "Din & İnanç",
  "Doğa", "Sanat", "Tarih", "Felsefe", "Eğitim",
  "Depresyon", "Bağımlılık", "Kayıp", "Göç", "Travma",
];

export default function Onboarding({ onDone }) {
  const { user } = useApp();
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  function toggle(interest) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(interest)) {
        next.delete(interest);
        return next;
      }
      if (next.size >= 5) return prev;
      next.add(interest);
      return next;
    });
  }

  async function handleDone() {
    if (selected.size !== 5 || !user) return;
    setSaving(true);
    await supabase.from("profiles").upsert(
      { id: user.id, interests: [...selected], updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    onDone();
  }

  const remaining = 5 - selected.size;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <p className={styles.brand}>Untold</p>
          <h1 className={styles.heading}>
            Sana özel deneyim için<br />5 ilgi alanı seç
          </h1>
          <p className={styles.sub}>
            {remaining > 0
              ? `${remaining} tane daha seç`
              : "Harika seçim! Devam edebilirsin."}
          </p>
        </div>

        <div className={styles.chips}>
          {ALL_INTERESTS.map(interest => (
            <button
              key={interest}
              className={`${styles.chip} ${selected.has(interest) ? styles.chipSelected : ""}`}
              onClick={() => toggle(interest)}
              type="button"
            >
              {interest}
            </button>
          ))}
        </div>

        <div className={styles.bottom}>
          <div className={styles.dots}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`${styles.dot} ${i < selected.size ? styles.dotFilled : ""}`}
              />
            ))}
          </div>
          <button
            className={styles.doneBtn}
            disabled={selected.size !== 5 || saving}
            onClick={handleDone}
            type="button"
          >
            {saving ? "Kaydediliyor…" : "Devam Et →"}
          </button>
        </div>
      </div>
    </div>
  );
}
