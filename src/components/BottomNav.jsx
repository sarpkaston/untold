import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
  const { user, unreadMsgCount } = useApp();
  const { pathname } = useLocation();

  const tabs = [
    { to: "/", label: "Keşfet", icon: <CompassIcon /> },
    { to: "/eslesmeler", label: "Bağlan", icon: <ConnectIcon /> },
    { to: "/hikayem", label: "Hikayem", icon: <BookIcon /> },
    { to: "/mesajlar", label: "Mesajlar", icon: <ChatIcon />, badge: unreadMsgCount },
    { to: "/profil", label: "Profil", icon: <PersonIcon /> },
  ];

  if (pathname.startsWith("/canli/")) return null;

  return (
    <nav className={styles.nav}>
      {tabs.map((tab) => {
        const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
        return (
          <Link key={tab.to} to={tab.to} className={`${styles.tab} ${active ? styles.active : ""}`}>
            <span className={styles.iconWrap}>
              {tab.icon}
              {tab.badge > 0 && (
                <span className={styles.unreadBadge}>{tab.badge > 99 ? "99+" : tab.badge}</span>
              )}
            </span>
            <span className={styles.label}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      <path d="M12 21.23v-3" strokeDasharray="2 2" />
      <path d="M8 17H5a2 2 0 0 1-2-2v-2" />
      <path d="M16 17h3a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
