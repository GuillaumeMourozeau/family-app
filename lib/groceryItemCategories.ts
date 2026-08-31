// Curated grocery-item categories (dairy, produce, etc.) — distinct from
// "places" (grocery_categories, actually stores). Labels are translated via
// groceries.itemCategories.* keys, looked up with t() at each call site.
// Icons are strings compatible with GroceryStoreIcon (Ionicons, or "mci:"
// prefixed MaterialCommunityIcons where Ionicons has no good match).
export const GROCERY_ITEM_CATEGORIES = [
  "fruits",
  "vegetables",
  "dairy",
  "meat",
  "seafood",
  "bakery",
  "frozen",
  "drinks",
  "dryGoods",
  "condiments",
  "desserts",
  "snacks",
  "asian",
  "toiletries",
  "household",
  "babyCare",
  "petSupplies",
  "sportItems",
  "other",
] as const;

export type GroceryItemCategory = (typeof GROCERY_ITEM_CATEGORIES)[number];

export const GROCERY_ITEM_CATEGORY_ORDER: Record<GroceryItemCategory, number> = Object.fromEntries(
  GROCERY_ITEM_CATEGORIES.map((c, i) => [c, i])
) as Record<GroceryItemCategory, number>;

export const GROCERY_ITEM_CATEGORY_ICONS: Record<GroceryItemCategory, string> = {
  fruits: "mci:food-apple-outline",
  vegetables: "mci:carrot",
  dairy: "mci:cheese",
  meat: "mci:food-drumstick-outline",
  seafood: "fish-outline",
  bakery: "mci:bread-slice-outline",
  frozen: "snow-outline",
  drinks: "mci:bottle-tonic-outline",
  dryGoods: "mci:rice",
  condiments: "mci:shaker-outline",
  desserts: "mci:cupcake",
  snacks: "mci:cookie-outline",
  asian: "mci:noodles",
  toiletries: "mci:toothbrush",
  household: "mci:spray-bottle",
  babyCare: "mci:baby-bottle-outline",
  petSupplies: "paw-outline",
  sportItems: "basketball-outline",
  other: "ellipsis-horizontal-outline",
};

export const DEFAULT_GROCERY_ITEM_CATEGORY: GroceryItemCategory = "other";

export function isGroceryItemCategory(value: string | null): value is GroceryItemCategory {
  return !!value && (GROCERY_ITEM_CATEGORIES as readonly string[]).includes(value);
}
