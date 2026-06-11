import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Ana Sayfa" },
    { to: "/kesif", label: "Keşfet" },
    { to: "/yaz", label: "Hikaye Yaz" },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoText}>Untold</span>
          <span className={styles.logoSub}>anlatılmamış hikayeler</span>
        </Link>

        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`${styles.link} ${location.pathname === l.to ? styles.active : ""}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <Link to="/giris" className={styles.loginBtn}>Giriş Yap</Link>
          <Link to="/kayit" className={styles.signupBtn}>Üye Ol</Link>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menü"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/giris" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
            Giriş Yap
          </Link>
          <Link to="/kayit" className={`${styles.mobileLink} ${styles.mobileLinkAccent}`} onClick={() => setMenuOpen(false)}>
            Üye Ol
          </Link>
        </div>
      )}
    </nav>
  );
}
