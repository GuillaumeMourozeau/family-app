import { useCallback, useEffect, useId, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { SchoolZone } from "@/lib/frenchHolidays";

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
  const [prefs, setPrefs] = useState<CalendarPrefs>(DEFAULTS);

  const refetch = useCallback(async () => {
    if (!familyId || !viewerId) return;
    const { data } = await supabase
      .from("calendar_prefs")
      .select("holiday_color, school_zone, show_public_holidays, show_school_holidays")
      .eq("profile_id", viewerId)
      .eq("family_id", familyId)
      .maybeSingle();
    setPrefs(data ?? DEFAULTS);
  }, [familyId, viewerId]);

  useEffect(() => {
    refetch();
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
  }, [familyId, refetch, instanceId]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  async function updatePrefs(patch: Partial<CalendarPrefs>) {
    if (!familyId || !viewerId) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase
      .from("calendar_prefs")
      .upsert({ profile_id: viewerId, family_id: familyId, ...next });
    if (error) refetch();
  }

  return { prefs, updatePrefs };
}
