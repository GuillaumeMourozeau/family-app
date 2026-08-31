import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { Ionicons } from "@expo/vector-icons";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type InsertPayload } from "@/lib/offline/handlers";
import { generateLocalId } from "@/lib/offline/id";

export type TodoCategory = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  sort_order: number;
  created_by: string;
  created_at: string;
};

export function useTodoCategories() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();
  const cacheKey = familyId ? `todoCategories:${familyId}` : null;

  const [categories, setCategories] = useState<TodoCategory[]>([]);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await supabase.from("todo_categories").select("*").order("sort_order", { ascending: true });
    if (error) return;
    setCategories(data ?? []);
    if (cacheKey) writeCache(cacheKey, data ?? []);
  }, [familyId, cacheKey]);

  useEffect(() => {
    (async () => {
      if (cacheKey) {
        const cached = await readCache<TodoCategory[]>(cacheKey);
        if (cached) setCategories(cached);
      }
      refetch();
    })();
    if (!familyId) return;
    const channel = supabase
      .channel(`todo_categories:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_categories", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, cacheKey, refetch, instanceId]);

  async function addCategory(name: string, icon: keyof typeof Ionicons.glyphMap) {
    if (!familyId || !profile) return { error: "You're not in a family yet.", category: null as TodoCategory | null };
    const id = generateLocalId();
    const nextSortOrder = categories.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1;
    const row = { name, icon, sort_order: nextSortOrder };
    const optimisticCategory: TodoCategory = { id, created_by: profile.id, created_at: new Date().toISOString(), ...row };
    setCategories((prev) => [...prev, optimisticCategory]);

    const payload: InsertPayload = { id, familyId, createdBy: profile.id, row };
    await withOfflineQueue("todoCategories:add", payload, () => offlineHandlers["todoCategories:add"](payload));
    return { error: null, category: optimisticCategory };
  }

  // Applies a new manual order in one batch — called after a drag-to-reorder
  // gesture settles, with the category ids in their final on-screen order.
  async function reorderCategories(orderedIds: string[]) {
    setCategories((prev) => [...prev].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)));
    const payload = { updates: orderedIds.map((id, index) => ({ id, sortOrder: index })) };
    await withOfflineQueue("todoCategories:reorder", payload, () => offlineHandlers["todoCategories:reorder"](payload));
  }

  return { categories, addCategory, reorderCategories, refetch };
}
