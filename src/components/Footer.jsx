import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.logo}>Untold</span>
          <p className={styles.tagline}>
            Herkesin anlatılmayı bekleyen bir hikayesi vardır.
          </p>
        </div>

        <div className={styles.columns}>
          <div className={styles.col}>
            <h4>Platform</h4>
            <Link to="/kesif">Keşfet</Link>
            <Link to="/yaz">Hikaye Yaz</Link>
            <Link to="/kategoriler">Kategoriler</Link>
          </div>
          <div className={styles.col}>
            <h4>Topluluk</h4>
            <Link to="/yazarlar">Yazarlar</Link>
            <Link to="/hakkimizda">Hakkımızda</Link>
            <Link to="/iletisim">İletişim</Link>
          </div>
          <div className={styles.col}>
            <h4>Destek</h4>
            <Link to="/yardim">Yardım</Link>
            <Link to="/gizlilik">Gizlilik</Link>
            <Link to="/kullanim">Kullanım Şartları</Link>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© 2026 Untold. Tüm hakları saklıdır.</p>
        <p className={styles.made}>Türkiye'den, sevgiyle.</p>
      </div>
    </footer>
  );
}
