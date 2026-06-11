import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ChangePassword.module.css";

function getStrength(pwd) {
  if (pwd.length === 0) return 0;
  if (pwd.length < 6) return 1;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score < 2) return 1;
  if (score < 3) return 2;
  if (score < 4) return 3;
  return 4;
}

const STRENGTH_LABELS = ["", "Zayıf", "Orta", "Güçlü", "Çok Güçlü"];
const STRENGTH_COLORS = ["", "#e74c3c", "#f39c12", "#27ae60", "#2ecc71"];

export default function ChangePassword() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strength = getStrength(newPass);
  const mismatch = confirm.length > 0 && newPass !== confirm;

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!current) { setError("Mevcut şifrenizi girin."); return; }
    if (newPass.length < 8) { setError("Yeni şifre en az 8 karakter olmalıdır."); return; }
    if (strength < 2) { setError("Lütfen daha güçlü bir şifre seçin."); return; }
    if (newPass !== confirm) { setError("Yeni şifreler eşleşmiyor."); return; }
    if (current === newPass) { setError("Yeni şifre mevcut şifrenizle aynı olamaz."); return; }

    setSuccess(true);
  }

  function toggle(field) {
    setShow((s) => ({ ...s, [field]: !s[field] }));
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.back} onClick={() => navigate(-1)}><ChevronLeft /></button>
          <h1 className={styles.title}>Şifre Değiştir</h1>
        </div>
        <div className={styles.successContainer}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Şifreniz Güncellendi</h2>
          <p className={styles.successText}>Şifreniz başarıyla değiştirildi. Güvenliğiniz için bu bilgiyi kimseyle paylaşmayın.</p>
          <button className={styles.successBtn} onClick={() => navigate(-1)}>Geri Dön</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}><ChevronLeft /></button>
        <h1 className={styles.title}>Şifre Değiştir</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.securityNote}>
          <LockIcon />
          <p>Güvenliğiniz için şifrenizi düzenli aralıklarla değiştirmenizi öneririz.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <PasswordField
            label="Mevcut Şifre"
            value={current}
            onChange={setCurrent}
            show={show.current}
            onToggle={() => toggle("current")}
            placeholder="Mevcut şifrenizi girin"
          />

          <div className={styles.divider} />

          <PasswordField
            label="Yeni Şifre"
            value={newPass}
            onChange={setNewPass}
            show={show.new}
            onToggle={() => toggle("new")}
            placeholder="En az 8 karakter"
          />

          {/* Strength meter */}
          {newPass.length > 0 && (
            <div className={styles.strengthBox}>
              <div className={styles.strengthBars}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={styles.strengthBar}
                    style={{ background: i <= strength ? STRENGTH_COLORS[strength] : "var(--border)" }}
                  />
                ))}
              </div>
              <span className={styles.strengthLabel} style={{ color: STRENGTH_COLORS[strength] }}>
                {STRENGTH_LABELS[strength]}
              </span>
            </div>
          )}

          <div className={styles.requirements}>
            <Req met={newPass.length >= 8} text="En az 8 karakter" />
            <Req met={/[A-Z]/.test(newPass)} text="Büyük harf" />
            <Req met={/[0-9]/.test(newPass)} text="Rakam" />
            <Req met={/[^A-Za-z0-9]/.test(newPass)} text="Özel karakter (!@#$...)" />
          </div>

          <PasswordField
            label="Yeni Şifre (Tekrar)"
            value={confirm}
            onChange={setConfirm}
            show={show.confirm}
            onToggle={() => toggle("confirm")}
            placeholder="Yeni şifrenizi tekrar girin"
            error={mismatch ? "Şifreler eşleşmiyor" : ""}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn}>
            Şifremi Kaydet
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder, error }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <div className={`${styles.inputWrap} ${error ? styles.inputError : ""}`}>
        <input
          className={styles.input}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button type="button" className={styles.eyeBtn} onClick={onToggle}>
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}

function Req({ met, text }) {
  return (
    <span className={`${styles.req} ${met ? styles.reqMet : ""}`}>
      {met ? "✓" : "○"} {text}
    </span>
  );
}

function ChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: "var(--terracotta)" }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
