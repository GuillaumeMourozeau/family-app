import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

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

  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase.from("meal_plan_entries").select("*").order("date", { ascending: true });
    setEntries(data ?? []);
    setIsLoading(false);
  }, [familyId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();
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
    await supabase.from("meal_plan_entries").insert({
      family_id: familyId,
      date: input.date,
      meal_type: input.mealType,
      recipe_id: input.recipeId,
      title: input.title,
      serves: input.serves,
      details: input.details,
      created_by: profile.id,
    });
  }

  async function updateMeal(id: string, input: MealPlanInput) {
    await supabase
      .from("meal_plan_entries")
      .update({
        date: input.date,
        meal_type: input.mealType,
        recipe_id: input.recipeId,
        title: input.title,
        serves: input.serves,
        details: input.details,
      })
      .eq("id", id);
  }

  async function deleteMeal(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id);
    if (error) refetch();
  }

  return { entries, isLoading, addMeal, updateMeal, deleteMeal, refetch };
}
