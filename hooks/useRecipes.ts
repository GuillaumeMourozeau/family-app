import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { RecipeCategory } from "@/lib/recipeCategories";
import { readCache, writeCache } from "@/lib/offline/cache";

export type RecipeIngredient = {
  id: string;
  quantity: string | null;
  name: string;
  sort_order: number;
};

export type Recipe = {
  id: string;
  name: string;
  details: string | null;
  categories: RecipeCategory[];
  created_by: string;
  created_at: string;
  ingredients: RecipeIngredient[];
};

export type IngredientInput = { quantity: string; name: string };

export function useRecipes() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();

  const cacheKey = familyId ? `recipes:${familyId}` : null;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data: recipeRows, error: recipesError } = await supabase
      .from("recipes")
      .select("*")
      .order("name", { ascending: true });
    if (recipesError) return; // offline or request failed — keep showing cached/local state
    const recipeIds = (recipeRows ?? []).map((r) => r.id);
    const { data: ingredientRows } =
      recipeIds.length > 0
        ? await supabase
            .from("recipe_ingredients")
            .select("*")
            .in("recipe_id", recipeIds)
            .order("sort_order", { ascending: true })
        : { data: [] };
    const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
    for (const ing of ingredientRows ?? []) {
      const list = ingredientsByRecipe.get(ing.recipe_id) ?? [];
      list.push(ing);
      ingredientsByRecipe.set(ing.recipe_id, list);
    }
    const next = (recipeRows ?? []).map((r) => ({ ...r, ingredients: ingredientsByRecipe.get(r.id) ?? [] }));
    setRecipes(next);
    if (cacheKey) writeCache(cacheKey, next);
  }, [familyId, cacheKey]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (cacheKey) {
        const cached = await readCache<Recipe[]>(cacheKey);
        if (cached && !cancelled) setRecipes(cached);
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
      .channel(`recipes:${familyId}:${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes", filter: `family_id=eq.${familyId}` }, () =>
        refetch()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_ingredients" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  async function addRecipe(
    name: string,
    details: string | null,
    categories: RecipeCategory[],
    ingredients: IngredientInput[]
  ) {
    if (!familyId || !profile) return { error: "You're not in a family yet.", recipe: null as Recipe | null };
    const { data, error } = await supabase
      .from("recipes")
      .insert({ family_id: familyId, name, details, categories, created_by: profile.id })
      .select()
      .single();
    if (error || !data) return { error: error?.message ?? "Couldn't create recipe.", recipe: null };

    const rows = ingredients
      .filter((i) => i.name.trim())
      .map((i, index) => ({
        recipe_id: data.id,
        quantity: i.quantity.trim() || null,
        name: i.name.trim(),
        sort_order: index,
      }));
    if (rows.length > 0) await supabase.from("recipe_ingredients").insert(rows);

    await refetch();
    return { error: null, recipe: { ...data, ingredients: [] } as Recipe };
  }

  async function updateRecipe(
    id: string,
    name: string,
    details: string | null,
    categories: RecipeCategory[],
    ingredients: IngredientInput[]
  ) {
    await supabase.from("recipes").update({ name, details, categories }).eq("id", id);
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id);
    const rows = ingredients
      .filter((i) => i.name.trim())
      .map((i, index) => ({
        recipe_id: id,
        quantity: i.quantity.trim() || null,
        name: i.name.trim(),
        sort_order: index,
      }));
    if (rows.length > 0) await supabase.from("recipe_ingredients").insert(rows);
    await refetch();
  }

  async function deleteRecipe(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) refetch();
  }

  return { recipes, isLoading, addRecipe, updateRecipe, deleteRecipe, refetch };
}
