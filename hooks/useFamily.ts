import { useCallback, useEffect, useId, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export type Family = {
  id: string;
  name: string;
  invite_code: string;
};

export function useFamily() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();
  const [family, setFamily] = useState<Family | null>(null);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase.from("families").select("*").eq("id", familyId).single();
    setFamily(data);
  }, [familyId]);

  useEffect(() => {
    refetch();

    if (!familyId) return;

    const channel = supabase
      .channel(`family:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "families", filter: `id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  // Belt-and-suspenders: also refetch whenever the screen using this hook
  // regains focus, in case a change was made on another screen (e.g. Calendar
  // Settings) while this one sat mounted-but-backgrounded.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  async function updateFamily(patch: Partial<Family>) {
    if (!familyId) return;
    setFamily((prev) => (prev ? { ...prev, ...patch } : prev));
    const { error } = await supabase.from("families").update(patch).eq("id", familyId);
    if (error) refetch();
  }

  return { family, updateFamily };
}
