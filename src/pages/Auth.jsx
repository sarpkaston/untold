import { useState } from "react";
import { useApp } from "../context/AppContext";
import styles from "./Auth.module.css";

export default function Auth({ onDone }) {
  const { signIn, signUp, resetPassword } = useApp();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function switchMode(next) {
    setMode(next);
    setError("");
    setSuccessMsg("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre zorunludur.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);

    if (mode === "login") {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(translateError(err.message));
        setLoading(false);
      } else {
        onDone();
      }
    } else {
      const { error: err, needsConfirmation } = await signUp(email, password, name);
      setLoading(false);
      if (err) {
        setError(translateError(err.message));
      } else if (needsConfirmation) {
        setSuccessMsg("Hesabınız oluşturuldu! E-postanıza doğrulama linki gönderildi. Linke tıkladıktan sonra giriş yapabilirsiniz.");
      } else {
        onDone();
      }
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Şifre sıfırlama için önce e-posta adresinizi girin.");
      return;
    }
    setLoading(true);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) {
      setError(translateError(err.message));
    } else {
      setSuccessMsg("Şifre sıfırlama linki e-postanıza gönderildi.");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.shimmer} />

      <div className={styles.logoArea}>
        <div className={styles.bookMark}>
          <span className={styles.bookMarkInner} />
        </div>
        <h1 className={styles.logo}>Untold</h1>
        <p className={styles.tagline}>anlatılmamış hikayeler</p>
      </div>

      <div className={styles.card}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${mode === "login" ? styles.modeBtnActive : ""}`}
            onClick={() => switchMode("login")}
            type="button"
          >
            Giriş Yap
          </button>
          <button
            className={`${styles.modeBtn} ${mode === "register" ? styles.modeBtnActive : ""}`}
            onClick={() => switchMode("register")}
            type="button"
          >
            Kayıt Ol
          </button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}
        {successMsg && <div className={styles.successBox}>{successMsg}</div>}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <div className={styles.field}>
              <label className={styles.label}>Ad Soyad</label>
              <div className={styles.inputWrap}>
                <PersonIcon />
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Adınızı girin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>E-posta</label>
            <div className={styles.inputWrap}>
              <MailIcon />
              <input
                className={styles.input}
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Şifre</label>
            <div className={styles.inputWrap}>
              <LockIcon />
              <input
                className={styles.input}
                type={showPass ? "text" : "password"}
                placeholder={mode === "register" ? "En az 6 karakter" : "Şifrenizi girin"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
              >
                {showPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {mode === "login" && (
            <button
              type="button"
              className={styles.forgotLink}
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Şifremi unuttum
            </button>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading
              ? "Lütfen bekleyin..."
              : mode === "login"
              ? "Giriş Yap"
              : "Hesap Oluştur"}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>veya</span>
          <span className={styles.dividerLine} />
        </div>

        <button className={styles.guestLink} type="button" onClick={onDone}>
          Misafir olarak devam et →
        </button>
      </div>

      <p className={styles.footer}>
        {mode === "login" ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}{" "}
        <button
          className={styles.switchMode}
          type="button"
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Kayıt ol" : "Giriş yap"}
        </button>
      </p>
    </div>
  );
}

function translateError(msg) {
  if (!msg) return "Bir hata oluştu, tekrar deneyin.";
  if (msg.includes("Invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (msg.includes("Email not confirmed")) return "E-postanızı henüz doğrulamadınız. Gelen kutunuzu kontrol edin.";
  if (msg.includes("User already registered")) return "Bu e-posta adresiyle zaten bir hesap var.";
  if (msg.includes("Password should be at least")) return "Şifre en az 6 karakter olmalıdır.";
  if (msg.includes("Unable to validate email address")) return "Geçersiz e-posta adresi.";
  if (msg.includes("rate limit")) return "Çok fazla deneme. Lütfen biraz bekleyin.";
  if (msg.includes("network")) return "Bağlantı hatası. İnternetinizi kontrol edin.";
  return msg;
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
