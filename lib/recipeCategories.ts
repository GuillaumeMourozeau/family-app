import type { Ionicons } from "@expo/vector-icons";

export type RecipeCategory = "appetizer" | "main" | "side" | "dessert" | "snack" | "breakfast" | "drink";

// Labels are translated — see common.recipeCategories.* keys, looked up via
// t(`common.recipeCategories.${id}`) at each call site instead of a static map.

export const RECIPE_CATEGORIES: {
  id: RecipeCategory;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "appetizer", icon: "restaurant-outline" },
  { id: "main", icon: "fast-food-outline" },
  { id: "side", icon: "leaf-outline" },
  { id: "dessert", icon: "ice-cream-outline" },
  { id: "snack", icon: "nutrition-outline" },
  { id: "breakfast", icon: "sunny-outline" },
  { id: "drink", icon: "wine-outline" },
];

export function categoryIcon(id: RecipeCategory): keyof typeof Ionicons.glyphMap {
  return RECIPE_CATEGORIES.find((c) => c.id === id)?.icon ?? "restaurant-outline";
}
