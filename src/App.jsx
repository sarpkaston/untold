import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Auth from "./pages/Auth";
import Splash from "./components/Splash";
import BottomNav from "./components/BottomNav";
import Discover from "./pages/Discover";
import Matches from "./pages/Matches";
import MyStory from "./pages/MyStory";
import Profile from "./pages/Profile";
import StoryDetail from "./pages/StoryDetail";
import Write from "./pages/Write";
import Notifications from "./pages/Notifications";
import Privacy from "./pages/Privacy";
import ChangePassword from "./pages/ChangePassword";
import Help from "./pages/Help";
import Terms from "./pages/Terms";
import LiveStream from "./pages/LiveStream";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Thread from "./pages/Thread";

function AppInner() {
  const { user, authLoading } = useApp();
  const [phase, setPhase] = useState("loading");
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!initialCheckDone.current) {
      initialCheckDone.current = true;
      // Returning user with existing session → skip splash
      setPhase(user ? "app" : "auth");
      return;
    }

    // Subsequent changes: logout → back to auth
    if (!user) setPhase("auth");
  }, [authLoading, user]);

  if (phase === "loading") return null;

  if (phase === "auth") {
    return <Auth onDone={() => setPhase("splash")} />;
  }

  if (phase === "splash") {
    return <Splash onDone={() => setPhase("app")} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/eslesmeler" element={<Matches />} />
        <Route path="/hikayem" element={<MyStory />} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/hikaye/:id" element={<StoryDetail />} />
        <Route path="/yaz" element={<Write />} />
        <Route path="/bildirimler" element={<Notifications />} />
        <Route path="/gizlilik" element={<Privacy />} />
        <Route path="/sifre-degistir" element={<ChangePassword />} />
        <Route path="/yardim" element={<Help />} />
        <Route path="/kullanim-kosullari" element={<Terms />} />
            <Route path="/canli/:roomName" element={<LiveStream />} />
        <Route path="/kullanici/:userId" element={<UserProfile />} />
        <Route path="/ayarlar" element={<Settings />} />
        <Route path="/mesajlar" element={<Messages />} />
        <Route path="/mesajlar/:userId" element={<Thread />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

function NotFound() {
  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      fontFamily: "'Playfair Display', Georgia, serif",
      color: "var(--ink-muted)",
      paddingBottom: "var(--bottom-nav-height)",
    }}>
      <h1 style={{ fontSize: "48px", color: "var(--terracotta)" }}>404</h1>
      <p style={{ fontSize: "18px" }}>Bu sayfa bulunamadı.</p>
      <a href="/" style={{ color: "var(--terracotta)", fontFamily: "'Inter', sans-serif", fontSize: "14px" }}>
        Ana sayfaya dön →
      </a>
    </div>
  );
}
