import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers } from "@/lib/offline/handlers";

export type FamilyRole = "admin" | "user";

export type FamilyMember = {
  id: string;
  full_name: string | null;
  color: string | null;
  is_managed: boolean;
  role: FamilyRole;
};

export function useFamilyMembers() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const viewerId = profile?.id;
  const instanceId = useId();
  const cacheKey = familyId && viewerId ? `familyMembers:${familyId}:${viewerId}` : null;
  const [members, setMembers] = useState<FamilyMember[]>([]);

  // Membership lives in family_members (separate from profiles.family_id,
  // which is just each person's currently-active family). Color is resolved
  // per-viewer here (member_color_prefs), so every consumer of `.color`
  // keeps working unchanged — it's just "the color I personally see them as".
  const refetch = useCallback(async () => {
    if (!familyId || !viewerId) return;
    const { data: memberRows, error: memberError } = await supabase
      .from("family_members")
      .select("profile_id, role")
      .eq("family_id", familyId);
    if (memberError) return; // offline or request failed — keep showing cached/local state
    const roleByProfile = new Map((memberRows ?? []).map((r) => [r.profile_id as string, r.role as FamilyRole]));
    const profileIds = Array.from(roleByProfile.keys());
    if (profileIds.length === 0) {
      setMembers([]);
      if (cacheKey) writeCache(cacheKey, []);
      return;
    }
    const [{ data: profileRows, error: profileError }, { data: colorRows, error: colorError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, is_managed")
        .in("id", profileIds)
        .order("created_at", { ascending: true }),
      supabase.from("member_color_prefs").select("member_id, color").eq("viewer_id", viewerId).in("member_id", profileIds),
    ]);
    if (profileError || colorError) return;
    const colorByMember = new Map((colorRows ?? []).map((r) => [r.member_id as string, r.color as string]));
    const next = (profileRows ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      is_managed: p.is_managed,
      role: roleByProfile.get(p.id) ?? "user",
      color: colorByMember.get(p.id) ?? null,
    }));
    setMembers(next);
    if (cacheKey) writeCache(cacheKey, next);
  }, [familyId, viewerId, cacheKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cacheKey) {
        const cached = await readCache<FamilyMember[]>(cacheKey);
        if (cached && !cancelled) setMembers(cached);
      }
      refetch();
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, refetch]);

  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`family_members:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "family_members", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "member_color_prefs" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  async function updateMemberColor(memberId: string, color: string) {
    if (!viewerId) return;
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, color } : m)));
    const payload = { viewerId, memberId, color };
    await withOfflineQueue("familyMembers:updateColor", payload, () => offlineHandlers["familyMembers:updateColor"](payload));
  }

  // Promote/remove/add/rename all go through server-side RPCs with their
  // own permission checks and side effects (creating a profile, cascading a
  // removal, ...) — not safe to blindly replay later, so these stay
  // online-only rather than being routed through the offline queue.
  async function promoteToAdmin(memberId: string) {
    if (!familyId) return { error: null as string | null };
    const { error } = await supabase.rpc("promote_to_admin", {
      target_profile_id: memberId,
      target_family_id: familyId,
    });
    if (!error) refetch();
    return { error: error?.message ?? null };
  }

  async function removeMember(memberId: string) {
    if (!familyId) return { error: null as string | null };
    const { error } = await supabase.rpc("remove_family_member", {
      target_profile_id: memberId,
      target_family_id: familyId,
    });
    if (!error) refetch();
    return { error: error?.message ?? null };
  }

  async function addManagedMember(name: string) {
    if (!familyId) return { error: null as string | null };
    const { error } = await supabase.rpc("add_managed_member", {
      target_family_id: familyId,
      member_name: name,
    });
    if (!error) refetch();
    return { error: error?.message ?? null };
  }

  async function renameMember(memberId: string, name: string) {
    const { error } = await supabase.rpc("rename_member", { target_member_id: memberId, new_name: name });
    if (!error) refetch();
    return { error: error?.message ?? null };
  }

  return { members, updateMemberColor, promoteToAdmin, removeMember, addManagedMember, renameMember };
}
