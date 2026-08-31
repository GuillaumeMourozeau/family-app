import { useCallback, useEffect, useId, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { SchoolZone } from "@/lib/frenchHolidays";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers } from "@/lib/offline/handlers";

export type CalendarPrefs = {
  holiday_color: string;
  school_zone: SchoolZone | null;
  show_public_holidays: boolean;
  show_school_holidays: boolean;
};

const DEFAULTS: CalendarPrefs = {
  holiday_color: "#F59E0B",
  school_zone: null,
  show_public_holidays: true,
  show_school_holidays: false,
};

export function useCalendarPrefs() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const viewerId = profile?.id;
  const instanceId = useId();
  const cacheKey = familyId && viewerId ? `calendarPrefs:${familyId}:${viewerId}` : null;
  const [prefs, setPrefs] = useState<CalendarPrefs>(DEFAULTS);

  const refetch = useCallback(async () => {
    if (!familyId || !viewerId) return;
    const { data, error } = await supabase
      .from("calendar_prefs")
      .select("holiday_color, school_zone, show_public_holidays, show_school_holidays")
      .eq("profile_id", viewerId)
      .eq("family_id", familyId)
      .maybeSingle();
    if (error) return; // offline or request failed — keep showing cached/local prefs
    const next = data ?? DEFAULTS;
    setPrefs(next);
    if (cacheKey) writeCache(cacheKey, next);
  }, [familyId, viewerId, cacheKey]);

  useEffect(() => {
    (async () => {
      if (cacheKey) {
        const cached = await readCache<CalendarPrefs>(cacheKey);
        if (cached) setPrefs(cached);
      }
      refetch();
    })();
    if (!familyId) return;
    const channel = supabase
      .channel(`calendar_prefs:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_prefs", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, cacheKey, refetch, instanceId]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  async function updatePrefs(patch: Partial<CalendarPrefs>) {
    if (!familyId || !viewerId) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (cacheKey) writeCache(cacheKey, next);
    const payload = { row: { profile_id: viewerId, family_id: familyId, ...next } };
    await withOfflineQueue("calendarPrefs:update", payload, () => offlineHandlers["calendarPrefs:update"](payload));
  }

  return { prefs, updatePrefs };
}
