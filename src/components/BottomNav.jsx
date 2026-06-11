import { Link, useLocation } from "react-router-dom";
import styles from "./BottomNav.module.css";

const tabs = [
  { to: "/", label: "Keşfet", icon: <CompassIcon /> },
  { to: "/eslesmeler", label: "Bağlan", icon: <ConnectIcon /> },
  { to: "/hikayem", label: "Hikayem", icon: <BookIcon /> },
  { to: "/profil", label: "Profil", icon: <PersonIcon /> },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link key={tab.to} to={tab.to} className={`${styles.tab} ${active ? styles.active : ""}`}>
            <span className={styles.icon}>{tab.icon}</span>
            <span className={styles.label}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      <path d="M12 21.23v-3" strokeDasharray="2 2" />
      <path d="M8 17H5a2 2 0 0 1-2-2v-2" />
      <path d="M16 17h3a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
