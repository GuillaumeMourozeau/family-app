import type { Ionicons } from "@expo/vector-icons";

// Generic store/shop-type icons for a grocery place. We deliberately don't
// reproduce real store brand logos (Leclerc, Carrefour, Tesco, Walmart, etc.)
// — those are trademarks we have no legitimate way to source or redraw, so
// this is a curated set of shop-type icons instead.
export const GROCERY_STORE_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "storefront-outline",
  "cart-outline",
  "basket-outline",
  "bag-outline",
  "business-outline",
  "restaurant-outline",
  "fast-food-outline",
  "pizza-outline",
  "cafe-outline",
  "ice-cream-outline",
  "nutrition-outline",
  "leaf-outline",
  "fish-outline",
  "egg-outline",
  "paw-outline",
  "flower-outline",
  "gift-outline",
  "wine-outline",
  "beer-outline",
  "pint-outline",
  "water-outline",
  "snow-outline",
  "medkit-outline",
  "home-outline",
];

export const DEFAULT_GROCERY_STORE_ICON: keyof typeof Ionicons.glyphMap = "storefront-outline";
