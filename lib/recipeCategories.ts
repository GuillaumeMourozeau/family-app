import type { Ionicons } from "@expo/vector-icons";

export type RecipeCategory = "appetizer" | "main" | "side" | "dessert" | "snack" | "breakfast" | "drink";

export const RECIPE_CATEGORIES: {
  id: RecipeCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "appetizer", label: "Appetizer", icon: "restaurant-outline" },
  { id: "main", label: "Main Dish", icon: "fast-food-outline" },
  { id: "side", label: "Side Dish", icon: "leaf-outline" },
  { id: "dessert", label: "Dessert", icon: "ice-cream-outline" },
  { id: "snack", label: "Snack", icon: "nutrition-outline" },
  { id: "breakfast", label: "Breakfast", icon: "sunny-outline" },
  { id: "drink", label: "Drink", icon: "wine-outline" },
];

export function categoryLabel(id: RecipeCategory): string {
  return RECIPE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function categoryIcon(id: RecipeCategory): keyof typeof Ionicons.glyphMap {
  return RECIPE_CATEGORIES.find((c) => c.id === id)?.icon ?? "restaurant-outline";
}
