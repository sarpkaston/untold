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
      return;
    }
    supabase.from("story_likes").select("story_id").eq("user_id", user.id)
      .then(({ data }) => setLikedIds((data || []).map((r) => r.story_id)));
    supabase.from("story_saves").select("story_id").eq("user_id", user.id)
      .then(({ data }) => setShelfIds((data || []).map((r) => r.story_id)));
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
    // Optimistik güncelleme
    setLikedIds((p) => alreadyLiked ? p.filter((x) => x !== id) : [...p, id]);

    if (!user || !isUUID(id)) return;

    if (alreadyLiked) {
      await supabase.from("story_likes").delete()
        .eq("user_id", user.id).eq("story_id", id);
      await supabase.rpc("decrement_story_likes", { p_story_id: id });
    } else {
      await supabase.from("story_likes")
        .upsert({ user_id: user.id, story_id: id }, { onConflict: "user_id,story_id" });
      await supabase.rpc("increment_story_likes", { p_story_id: id });
    }
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
        .upsert({ user_id: user.id, story_id: id }, { onConflict: "user_id,story_id" });
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
