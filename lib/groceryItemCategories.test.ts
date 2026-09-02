import {
  GROCERY_ITEM_CATEGORIES,
  GROCERY_ITEM_CATEGORY_ICONS,
  isGroceryItemCategory,
} from "@/lib/groceryItemCategories";

describe("GROCERY_ITEM_CATEGORIES", () => {
  it("has an icon for every category, with no duplicates in the list", () => {
    expect(new Set(GROCERY_ITEM_CATEGORIES).size).toBe(GROCERY_ITEM_CATEGORIES.length);
    for (const category of GROCERY_ITEM_CATEGORIES) {
      expect(GROCERY_ITEM_CATEGORY_ICONS[category]).toBeTruthy();
    }
  });
});

describe("isGroceryItemCategory", () => {
  it("accepts every category in the curated list", () => {
    for (const category of GROCERY_ITEM_CATEGORIES) {
      expect(isGroceryItemCategory(category)).toBe(true);
    }
  });

  it("rejects unknown strings and null", () => {
    expect(isGroceryItemCategory("not-a-real-category")).toBe(false);
    expect(isGroceryItemCategory(null)).toBe(false);
    expect(isGroceryItemCategory("")).toBe(false);
  });
});
