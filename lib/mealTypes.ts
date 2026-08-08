import type { Ionicons } from "@expo/vector-icons";
import type { MealType } from "@/hooks/useMealPlan";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export const MEAL_TYPE_ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };

// Labels are translated — see common.mealTypes.* keys, looked up via
// t(`common.mealTypes.${type}`) at each call site instead of a static map.

export const MEAL_TYPE_ICONS: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  snack: "nutrition-outline",
  dinner: "moon-outline",
};
