import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export type MyFamily = { id: string; name: string };

export function useMyFamilies() {
  const { profile, refetch: refetchProfile } = useProfile();
  const userId = profile?.id;
  const instanceId = useId();
  const [families, setFamilies] = useState<MyFamily[]>([]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    const { data: memberRows } = await supabase.from("family_members").select("family_id").eq("profile_id", userId);
    const familyIds = (memberRows ?? []).map((r) => r.family_id);
    if (familyIds.length === 0) {
      setFamilies([]);
      return;
    }
    const { data } = await supabase
      .from("families")
      .select("id, name")
      .in("id", familyIds)
      .order("created_at", { ascending: true });
    setFamilies(data ?? []);
  }, [userId]);

  useEffect(() => {
    refetch();

    if (!userId) return;

    const channel = supabase
      .channel(`my_families:${userId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_members", filter: `profile_id=eq.${userId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch, instanceId]);

  async function switchFamily(familyId: string) {
    const { error } = await supabase.rpc("switch_active_family", { target_family_id: familyId });
    if (!error) await refetchProfile();
    return { error: error?.message ?? null };
  }

  return { families, switchFamily, refetch };
}
