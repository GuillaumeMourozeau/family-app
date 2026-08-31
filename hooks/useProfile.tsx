import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { readCache, writeCache } from "@/lib/offline/cache";

export type NotificationPrefs = {
  messages: boolean;
  calendar: boolean;
  todos: boolean;
  urgentTodos: boolean;
  groceries: boolean;
};

export type Profile = {
  id: string;
  family_id: string | null;
  full_name: string | null;
  created_at: string;
  is_managed: boolean;
  last_seen_activity_at: string;
  home_visible_sections: string[];
  notification_prefs: NotificationPrefs;
};

type ProfileContextValue = {
  profile: Profile | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  markActivitySeen: () => Promise<void>;
  updateHomeSections: (sections: string[]) => Promise<void>;
  updateNotificationPrefs: (prefs: NotificationPrefs) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  isLoading: true,
  refetch: async () => {},
  markActivitySeen: async () => {},
  updateHomeSections: async () => {},
  updateNotificationPrefs: async () => {},
});

export function ProfileProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Offline or the request failed — keep whatever profile is already
    // loaded (from cache or a prior fetch) rather than wiping it, since
    // this is the row every other hook depends on for family_id.
    if (!error) {
      setProfile(data);
      writeCache(`profile:${userId}`, data);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (userId) {
        const cached = await readCache<Profile>(`profile:${userId}`);
        if (cached && !cancelled) setProfile(cached);
      }
      await refetch();
    })();

    if (!userId) {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => setProfile(payload.new as Profile)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  async function markActivitySeen() {
    if (!userId) return;
    const now = new Date().toISOString();
    setProfile((prev) => (prev ? { ...prev, last_seen_activity_at: now } : prev));
    await supabase.from("profiles").update({ last_seen_activity_at: now }).eq("id", userId);
  }

  async function updateHomeSections(sections: string[]) {
    if (!userId) return;
    setProfile((prev) => (prev ? { ...prev, home_visible_sections: sections } : prev));
    await supabase.from("profiles").update({ home_visible_sections: sections }).eq("id", userId);
  }

  async function updateNotificationPrefs(prefs: NotificationPrefs) {
    if (!userId) return;
    setProfile((prev) => (prev ? { ...prev, notification_prefs: prefs } : prev));
    await supabase.from("profiles").update({ notification_prefs: prefs }).eq("id", userId);
  }

  return (
    <ProfileContext.Provider
      value={{ profile, isLoading, refetch, markActivitySeen, updateHomeSections, updateNotificationPrefs }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
