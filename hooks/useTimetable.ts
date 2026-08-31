import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { toDateKey } from "@/lib/dateUtils";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type DeletePayload, type InsertPayload, type UpdatePayload } from "@/lib/offline/handlers";
import { generateLocalId } from "@/lib/offline/id";

export type TimetableBlock = {
  id: string;
  profile_id: string | null;
  applies_to_whole_family: boolean;
  days_of_week: number[]; // 0 = Monday .. 6 = Sunday
  start_time: string; // "HH:MM:SS"
  end_time: string;
  label: string;
  created_by: string;
};

export type TimetableOverride = {
  id: string;
  block_id: string;
  override_date: string; // "YYYY-MM-DD"
  is_cancelled: boolean;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
};

export function useTimetable() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();
  const blocksCacheKey = familyId ? `timetableBlocks:${familyId}` : null;
  const overridesCacheKey = familyId ? `timetableOverrides:${familyId}` : null;

  const [blocks, setBlocks] = useState<TimetableBlock[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data: blockRows, error: blocksError } = await supabase.from("timetable_blocks").select("*").eq("family_id", familyId);
    if (blocksError) return;
    const blockIds = (blockRows ?? []).map((b) => b.id);
    const { data: overrideRows, error: overridesError } =
      blockIds.length > 0
        ? await supabase.from("timetable_overrides").select("*").in("block_id", blockIds)
        : { data: [], error: null };
    if (overridesError) return;
    setBlocks(blockRows ?? []);
    setOverrides(overrideRows ?? []);
    if (blocksCacheKey) writeCache(blocksCacheKey, blockRows ?? []);
    if (overridesCacheKey) writeCache(overridesCacheKey, overrideRows ?? []);
  }, [familyId, blocksCacheKey, overridesCacheKey]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (blocksCacheKey && overridesCacheKey) {
        const [cachedBlocks, cachedOverrides] = await Promise.all([
          readCache<TimetableBlock[]>(blocksCacheKey),
          readCache<TimetableOverride[]>(overridesCacheKey),
        ]);
        if (!cancelled) {
          if (cachedBlocks) setBlocks(cachedBlocks);
          if (cachedOverrides) setOverrides(cachedOverrides);
        }
      }
      await refetch();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, blocksCacheKey, overridesCacheKey, refetch]);

  useEffect(() => {
    if (!familyId) return;
    const channel = supabase
      .channel(`timetable:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "timetable_blocks", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "timetable_overrides" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  async function addBlock(input: {
    profileId: string | null;
    appliesToWholeFamily: boolean;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    label: string;
  }) {
    if (!familyId || !profile || input.daysOfWeek.length === 0) return null;
    const id = generateLocalId();
    const row = {
      profile_id: input.appliesToWholeFamily ? null : input.profileId,
      applies_to_whole_family: input.appliesToWholeFamily,
      days_of_week: input.daysOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      label: input.label,
    };
    const optimisticBlock: TimetableBlock = { id, created_by: profile.id, ...row };
    setBlocks((prev) => [...prev, optimisticBlock]);

    const payload: InsertPayload = { id, familyId, createdBy: profile.id, row };
    await withOfflineQueue("timetableBlocks:add", payload, () => offlineHandlers["timetableBlocks:add"](payload));
    return optimisticBlock;
  }

  async function updateBlock(
    id: string,
    input: { startTime: string; endTime: string; label: string; daysOfWeek: number[] }
  ) {
    if (input.daysOfWeek.length === 0) return;
    const row = { start_time: input.startTime, end_time: input.endTime, label: input.label, days_of_week: input.daysOfWeek };
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...row } : b)));
    const payload: UpdatePayload = { id, row };
    await withOfflineQueue("timetableBlocks:update", payload, () => offlineHandlers["timetableBlocks:update"](payload));
  }

  async function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setOverrides((prev) => prev.filter((o) => o.block_id !== id));
    const payload: DeletePayload = { id };
    await withOfflineQueue("timetableBlocks:delete", payload, () => offlineHandlers["timetableBlocks:delete"](payload));
  }

  async function setOverride(
    blockId: string,
    date: string,
    patch: { isCancelled?: boolean; startTime?: string | null; endTime?: string | null; label?: string | null }
  ) {
    const row = {
      block_id: blockId,
      override_date: date,
      is_cancelled: patch.isCancelled ?? false,
      start_time: patch.startTime ?? null,
      end_time: patch.endTime ?? null,
      label: patch.label ?? null,
    };
    setOverrides((prev) => {
      const existingIndex = prev.findIndex((o) => o.block_id === blockId && o.override_date === date);
      const optimisticOverride: TimetableOverride = { id: existingIndex >= 0 ? prev[existingIndex].id : generateLocalId(), ...row };
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = optimisticOverride;
        return next;
      }
      return [...prev, optimisticOverride];
    });

    const payload = { row };
    await withOfflineQueue("timetableOverrides:upsert", payload, () => offlineHandlers["timetableOverrides:upsert"](payload));
  }

  async function clearOverride(blockId: string, date: string) {
    setOverrides((prev) => prev.filter((o) => !(o.block_id === blockId && o.override_date === date)));
    const payload = { blockId, date };
    await withOfflineQueue("timetableOverrides:clear", payload, () => offlineHandlers["timetableOverrides:clear"](payload));
  }

  // Cancels every occurrence of a block's usual days within [startDate, endDate]
  // in one shot — e.g. skip a work schedule for the weeks of a holiday, without
  // deleting the schedule or cancelling each day one at a time.
  async function cleanWeeks(blockId: string, daysOfWeek: number[], startDate: Date, endDate: Date) {
    const rows: {
      block_id: string;
      override_date: string;
      is_cancelled: boolean;
      start_time: null;
      end_time: null;
      label: null;
    }[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    while (cursor <= end) {
      const jsDay = cursor.getDay();
      const monFirstDay = jsDay === 0 ? 6 : jsDay - 1;
      if (daysOfWeek.includes(monFirstDay)) {
        rows.push({
          block_id: blockId,
          override_date: toDateKey(cursor),
          is_cancelled: true,
          start_time: null,
          end_time: null,
          label: null,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (rows.length === 0) return;

    setOverrides((prev) => {
      const next = [...prev];
      for (const row of rows) {
        const existingIndex = next.findIndex((o) => o.block_id === row.block_id && o.override_date === row.override_date);
        const optimisticOverride: TimetableOverride = { id: existingIndex >= 0 ? next[existingIndex].id : generateLocalId(), ...row };
        if (existingIndex >= 0) next[existingIndex] = optimisticOverride;
        else next.push(optimisticOverride);
      }
      return next;
    });

    const payload = { rows };
    await withOfflineQueue("timetableOverrides:upsertMany", payload, () => offlineHandlers["timetableOverrides:upsertMany"](payload));
  }

  return {
    blocks,
    overrides,
    isLoading,
    addBlock,
    updateBlock,
    deleteBlock,
    setOverride,
    clearOverride,
    cleanWeeks,
    refetch,
  };
}
