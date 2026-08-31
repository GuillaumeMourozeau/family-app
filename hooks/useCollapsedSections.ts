import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useProfile } from "@/hooks/useProfile";

const STORAGE_PREFIX = "collapsedSections";

// Remembers which sections (grocery store, to-do category/priority group)
// a given user has collapsed, per screen — persisted locally since it's a
// personal display preference, not something that needs to sync to the rest
// of the family.
export function useCollapsedSections(screenKey: string) {
  const { profile } = useProfile();
  const storageKey = profile ? `${STORAGE_PREFIX}:${profile.id}:${screenKey}` : null;

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    if (!storageKey) {
      setCollapsed({});
      setIsLoaded(true);
      return;
    }
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (cancelled) return;
      setCollapsed(raw ? JSON.parse(raw) : {});
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const toggle = useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        if (storageKey) AsyncStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey]
  );

  const isCollapsed = useCallback((id: string) => !!collapsed[id], [collapsed]);

  return { isCollapsed, toggle, isLoaded };
}
