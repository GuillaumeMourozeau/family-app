import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

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

  const [blocks, setBlocks] = useState<TimetableBlock[]>([]);
  const [overrides, setOverrides] = useState<TimetableOverride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data: blockRows } = await supabase.from("timetable_blocks").select("*").eq("family_id", familyId);
    const blockIds = (blockRows ?? []).map((b) => b.id);
    const { data: overrideRows } =
      blockIds.length > 0
        ? await supabase.from("timetable_overrides").select("*").in("block_id", blockIds)
        : { data: [] };
    setBlocks(blockRows ?? []);
    setOverrides(overrideRows ?? []);
    setIsLoading(false);
  }, [familyId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
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
    if (!familyId || !profile || input.daysOfWeek.length === 0) return;
    await supabase.from("timetable_blocks").insert({
      family_id: familyId,
      profile_id: input.appliesToWholeFamily ? null : input.profileId,
      applies_to_whole_family: input.appliesToWholeFamily,
      days_of_week: input.daysOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      label: input.label,
      created_by: profile.id,
    });
  }

  async function updateBlock(
    id: string,
    input: { startTime: string; endTime: string; label: string; daysOfWeek: number[] }
  ) {
    if (input.daysOfWeek.length === 0) return;
    await supabase
      .from("timetable_blocks")
      .update({
        start_time: input.startTime,
        end_time: input.endTime,
        label: input.label,
        days_of_week: input.daysOfWeek,
      })
      .eq("id", id);
  }

  async function deleteBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    const { error } = await supabase.from("timetable_blocks").delete().eq("id", id);
    if (error) refetch();
  }

  async function setOverride(
    blockId: string,
    date: string,
    patch: { isCancelled?: boolean; startTime?: string | null; endTime?: string | null; label?: string | null }
  ) {
    await supabase.from("timetable_overrides").upsert(
      {
        block_id: blockId,
        override_date: date,
        is_cancelled: patch.isCancelled ?? false,
        start_time: patch.startTime ?? null,
        end_time: patch.endTime ?? null,
        label: patch.label ?? null,
      },
      { onConflict: "block_id,override_date" }
    );
  }

  async function clearOverride(blockId: string, date: string) {
    await supabase.from("timetable_overrides").delete().eq("block_id", blockId).eq("override_date", date);
  }

  return { blocks, overrides, isLoading, addBlock, updateBlock, deleteBlock, setOverride, clearOverride, refetch };
}
