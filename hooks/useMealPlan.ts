import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type DeletePayload, type InsertPayload, type UpdatePayload } from "@/lib/offline/handlers";
import { generateLocalId } from "@/lib/offline/id";

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";

export type MealPlanEntry = {
  id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string | null;
  title: string;
  serves: number | null;
  details: string | null;
  created_by: string;
  created_at: string;
};

export type MealPlanInput = {
  date: string;
  mealType: MealType;
  recipeId: string | null;
  title: string;
  serves: number | null;
  details: string | null;
};

export function useMealPlan() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();
  const cacheKey = familyId ? `mealPlan:${familyId}` : null;

  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await supabase.from("meal_plan_entries").select("*").order("date", { ascending: true });
    if (error) return;
    setEntries(data ?? []);
    if (cacheKey) writeCache(cacheKey, data ?? []);
  }, [familyId, cacheKey]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (cacheKey) {
        const cached = await readCache<MealPlanEntry[]>(cacheKey);
        if (cached && !cancelled) setEntries(cached);
      }
      await refetch();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, cacheKey, refetch]);

  useEffect(() => {
    if (!familyId) return;
    const channel = supabase
      .channel(`meal_plan_entries:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meal_plan_entries", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  async function addMeal(input: MealPlanInput) {
    if (!familyId || !profile) return;
    const id = generateLocalId();
    const row = {
      date: input.date,
      meal_type: input.mealType,
      recipe_id: input.recipeId,
      title: input.title,
      serves: input.serves,
      details: input.details,
    };
    const optimisticEntry: MealPlanEntry = { id, created_by: profile.id, created_at: new Date().toISOString(), ...row };
    setEntries((prev) => [...prev, optimisticEntry].sort((a, b) => a.date.localeCompare(b.date)));

    const payload: InsertPayload = { id, familyId, createdBy: profile.id, row };
    await withOfflineQueue("mealPlan:add", payload, () => offlineHandlers["mealPlan:add"](payload));
  }

  async function updateMeal(id: string, input: MealPlanInput) {
    const row = {
      date: input.date,
      meal_type: input.mealType,
      recipe_id: input.recipeId,
      title: input.title,
      serves: input.serves,
      details: input.details,
    };
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...row } : e)));
    const payload: UpdatePayload = { id, row };
    await withOfflineQueue("mealPlan:update", payload, () => offlineHandlers["mealPlan:update"](payload));
  }

  async function deleteMeal(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const payload: DeletePayload = { id };
    await withOfflineQueue("mealPlan:delete", payload, () => offlineHandlers["mealPlan:delete"](payload));
  }

  return { entries, isLoading, addMeal, updateMeal, deleteMeal, refetch };
}
