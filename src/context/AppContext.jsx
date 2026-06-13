import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AppContext = createContext();

const isUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(String(id));

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [likedIds, setLikedIds] = useState([]);
  const [shelfIds, setShelfIds] = useState([]);
  const [bookmarkIds, setBookmarkIds] = useState([]);
  const [connectionIds, setConnectionIds] = useState([]);
  const [reportedIds, setReportedIds] = useState([]);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Kullanıcı girince beğenileri ve rafı Supabase'den yükle
  useEffect(() => {
    if (!user) {
      setLikedIds([]);
      setShelfIds([]);
      setReportedIds([]);
      setUnreadMsgCount(0);
      return;
    }
    supabase.from("story_likes").select("story_id").eq("user_id", user.id)
      .then(({ data }) => setLikedIds((data || []).map((r) => r.story_id)));
    supabase.from("story_saves").select("story_id").eq("user_id", user.id)
      .then(({ data }) => setShelfIds((data || []).map((r) => r.story_id)));
    supabase.from("story_reports").select("story_id").eq("user_id", user.id)
      .then(({ data }) => setReportedIds((data || []).map((r) => r.story_id)));

    const fetchUnread = () =>
      supabase.from("messages").select("*", { count: "exact", head: true })
        .eq("to_user_id", user.id).eq("read", false)
        .then(({ count }) => setUnreadMsgCount(count ?? 0));
    fetchUnread();
    const msgChannel = supabase
      .channel(`unread-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `to_user_id=eq.${user.id}` },
        () => setUnreadMsgCount((p) => p + 1))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `to_user_id=eq.${user.id}` },
        fetchUnread)
      .subscribe();
    return () => supabase.removeChannel(msgChannel);
  }, [user]);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) return { error, needsConfirmation: false };
    const needsConfirmation = Boolean(data.user && !data.session);
    return { error: null, needsConfirmation };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  }

  async function toggleLike(id) {
    const alreadyLiked = likedIds.includes(id);
    setLikedIds((p) => alreadyLiked ? p.filter((x) => x !== id) : [...p, id]);

    if (!user || !isUUID(id)) return { error: null };

    let error = null;
    if (alreadyLiked) {
      const { error: e } = await supabase.from("story_likes").delete()
        .eq("user_id", user.id).eq("story_id", id);
      error = e;
      if (!e) await supabase.rpc("decrement_story_likes", { p_story_id: id });
    } else {
      const { error: e } = await supabase.from("story_likes")
        .upsert({ user_id: user.id, story_id: id }, { onConflict: "user_id,story_id" });
      error = e;
      if (!e) await supabase.rpc("increment_story_likes", { p_story_id: id });
    }

    if (error) {
      setLikedIds((p) => alreadyLiked ? [...p, id] : p.filter((x) => x !== id));
    }

    return { error };
  }

  async function toggleShelf(id) {
    const alreadyOnShelf = shelfIds.includes(id);
    setShelfIds((p) => alreadyOnShelf ? p.filter((x) => x !== id) : [...p, id]);

    if (!user || !isUUID(id)) return;

    if (alreadyOnShelf) {
      await supabase.from("story_saves").delete()
        .eq("user_id", user.id).eq("story_id", id);
    } else {
      await supabase.from("story_saves")
        .insert({ user_id: user.id, story_id: id });
    }
  }

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,

        likedIds,
        toggleLike,
        isLiked: (id) => likedIds.includes(id),

        shelfIds,
        toggleShelf,
        isOnShelf: (id) => shelfIds.includes(id),

        bookmarkIds,
        toggleBookmark: (id) => setBookmarkIds((p) =>
          p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
        ),
        isBookmarked: (id) => bookmarkIds.includes(id),

        connectionIds,
        toggleConnection: (id) => setConnectionIds((p) =>
          p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
        ),
        isConnected: (id) => connectionIds.includes(id),

        reportedIds,
        addReport: (id) => setReportedIds((p) => p.includes(id) ? p : [...p, id]),
        isReported: (id) => reportedIds.includes(id),

        unreadMsgCount,
        refreshUnreadCount: () => {
          if (!user) return;
          supabase.from("messages").select("*", { count: "exact", head: true })
            .eq("to_user_id", user.id).eq("read", false)
            .then(({ count }) => setUnreadMsgCount(count ?? 0));
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
