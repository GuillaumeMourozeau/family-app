import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { RecipeCategory } from "@/lib/recipeCategories";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type DeletePayload, type RecipeInsertPayload, type RecipeUpdatePayload } from "@/lib/offline/handlers";
import { generateLocalId } from "@/lib/offline/id";

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
    const id = generateLocalId();
    const cleanIngredients = ingredients
      .filter((i) => i.name.trim())
      .map((i, index) => ({ quantity: i.quantity.trim() || null, name: i.name.trim(), sortOrder: index }));
    const optimisticRecipe: Recipe = {
      id,
      name,
      details,
      categories,
      created_by: profile.id,
      created_at: new Date().toISOString(),
      ingredients: cleanIngredients.map((i) => ({ id: generateLocalId(), quantity: i.quantity, name: i.name, sort_order: i.sortOrder })),
    };
    setRecipes((prev) => [...prev, optimisticRecipe]);

    const payload: RecipeInsertPayload = { id, familyId, createdBy: profile.id, row: { name, details, categories }, ingredients: cleanIngredients };
    await withOfflineQueue("recipes:add", payload, () => offlineHandlers["recipes:add"](payload));
    return { error: null, recipe: optimisticRecipe };
  }

  async function updateRecipe(
    id: string,
    name: string,
    details: string | null,
    categories: RecipeCategory[],
    ingredients: IngredientInput[]
  ) {
    const cleanIngredients = ingredients
      .filter((i) => i.name.trim())
      .map((i, index) => ({ quantity: i.quantity.trim() || null, name: i.name.trim(), sortOrder: index }));
    const optimisticIngredients: RecipeIngredient[] = cleanIngredients.map((i) => ({
      id: generateLocalId(),
      quantity: i.quantity,
      name: i.name,
      sort_order: i.sortOrder,
    }));
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, name, details, categories, ingredients: optimisticIngredients } : r)));

    const payload: RecipeUpdatePayload = { id, row: { name, details, categories }, ingredients: cleanIngredients };
    await withOfflineQueue("recipes:update", payload, () => offlineHandlers["recipes:update"](payload));
  }

  async function deleteRecipe(id: string) {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    const payload: DeletePayload = { id };
    await withOfflineQueue("recipes:delete", payload, () => offlineHandlers["recipes:delete"](payload));
  }

  return { recipes, isLoading, addRecipe, updateRecipe, deleteRecipe, refetch };
}
