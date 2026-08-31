import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { DEFAULT_GROCERY_STORE_ICON } from "@/lib/groceryStoreIcons";
import { DEFAULT_GROCERY_ITEM_CATEGORY, GROCERY_ITEM_CATEGORY_ORDER, type GroceryItemCategory } from "@/lib/groceryItemCategories";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type DeletePayload, type InsertPayload, type UpdatePayload } from "@/lib/offline/handlers";
import { generateLocalId } from "@/lib/offline/id";

export type GroceryPlace = {
  id: string;
  name: string;
  is_default: boolean;
  icon: string;
  sort_order: number;
};

export type GroceryItem = {
  id: string;
  name: string;
  description: string | null;
  is_checked: boolean;
  is_archived: boolean;
  category_id: string | null;
  item_category: string;
  source_meal_entry_id: string | null;
  created_at: string;
  created_by: string;
};

export type GroceryHistoryEntry = { id: string; name: string; itemCategory: string };

function categoryOrder(itemCategory: string): number {
  return GROCERY_ITEM_CATEGORY_ORDER[itemCategory as GroceryItemCategory] ?? 999;
}

// Category-then-alphabetical: the order requested for both the live list
// and the "previously added here" suggestions.
export function byCategoryThenName(a: { name: string; category: string }, b: { name: string; category: string }): number {
  const orderDiff = categoryOrder(a.category) - categoryOrder(b.category);
  if (orderDiff !== 0) return orderDiff;
  return a.name.localeCompare(b.name);
}

export function useGroceries() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();
  const itemsCacheKey = familyId ? `groceryItems:${familyId}` : null;
  const placesCacheKey = familyId ? `groceryPlaces:${familyId}` : null;

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [places, setPlaces] = useState<GroceryPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const [{ data: itemsData, error: itemsError }, { data: placesData, error: placesError }] = await Promise.all([
      supabase.from("grocery_items").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("grocery_categories").select("*").order("sort_order", { ascending: true }),
    ]);
    if (itemsError || placesError) return;
    setItems(itemsData ?? []);
    setPlaces(placesData ?? []);
    if (itemsCacheKey) writeCache(itemsCacheKey, itemsData ?? []);
    if (placesCacheKey) writeCache(placesCacheKey, placesData ?? []);
  }, [familyId, itemsCacheKey, placesCacheKey]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (itemsCacheKey && placesCacheKey) {
        const [cachedItems, cachedPlaces] = await Promise.all([
          readCache<GroceryItem[]>(itemsCacheKey),
          readCache<GroceryPlace[]>(placesCacheKey),
        ]);
        if (!cancelled) {
          if (cachedItems) setItems(cachedItems);
          if (cachedPlaces) setPlaces(cachedPlaces);
        }
      }
      await refetch();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, itemsCacheKey, placesCacheKey, refetch]);

  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`groceries:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_items", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "grocery_categories", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  const activeItems = useMemo(() => items.filter((i) => !i.is_archived), [items]);

  const defaultPlace = useMemo(() => places.find((p) => p.is_default) ?? null, [places]);

  const historyByPlace = useMemo(() => {
    // Every name ever used at a place, active or archived — tapping an
    // already-active suggestion is a safe no-op via addItem's dedupe guard,
    // so there's no need to hide currently-active items from this list.
    const seenByPlace = new Map<string, Set<string>>();
    const historyMap = new Map<string, GroceryHistoryEntry[]>();
    for (const item of items) {
      const key = item.category_id ?? "";
      const nameKey = item.name.toLowerCase();
      const seen = seenByPlace.get(key) ?? new Set<string>();
      if (seen.has(nameKey)) continue;
      seen.add(nameKey);
      seenByPlace.set(key, seen);
      const list = historyMap.get(key) ?? [];
      list.push({ id: item.id, name: item.name, itemCategory: item.item_category });
      historyMap.set(key, list);
    }
    for (const list of historyMap.values()) {
      list.sort((a, b) => byCategoryThenName({ name: a.name, category: a.itemCategory }, { name: b.name, category: b.itemCategory }));
    }
    return historyMap;
  }, [items]);

  function getHistoryForPlace(categoryId: string | null) {
    return historyByPlace.get(categoryId ?? "") ?? [];
  }

  async function addPlace(name: string, icon: string = DEFAULT_GROCERY_STORE_ICON) {
    if (!familyId) return null;
    const id = generateLocalId();
    const nextSortOrder = places.reduce((max, p) => Math.max(max, p.sort_order), 0) + 1;
    const row = { name, icon, sort_order: nextSortOrder };
    const optimisticPlace: GroceryPlace = { id, is_default: false, ...row };
    setPlaces((prev) => [...prev, optimisticPlace]);

    const payload: InsertPayload = { id, familyId, createdBy: profile?.id ?? "", row };
    await withOfflineQueue("groceryPlaces:add", payload, () => offlineHandlers["groceryPlaces:add"](payload));
    return optimisticPlace;
  }

  // Applies a new manual order in one batch — called after a drag-to-reorder
  // gesture settles, with the place ids in their final on-screen order.
  async function reorderPlaces(orderedIds: string[]) {
    setPlaces((prev) => [...prev].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)));
    const payload = { updates: orderedIds.map((id, index) => ({ id, sortOrder: index })) };
    await withOfflineQueue("groceryPlaces:reorder", payload, () => offlineHandlers["groceryPlaces:reorder"](payload));
  }

  async function updatePlaceIcon(id: string, icon: string) {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, icon } : p)));
    const payload: UpdatePayload = { id, row: { icon } };
    await withOfflineQueue("groceryPlaces:update", payload, () => offlineHandlers["groceryPlaces:update"](payload));
  }

  async function renamePlace(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name can't be empty." };
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    const payload: UpdatePayload = { id, row: { name: trimmed } };
    await withOfflineQueue("groceryPlaces:update", payload, () => offlineHandlers["groceryPlaces:update"](payload));
    return { error: null };
  }

  async function deletePlace(id: string) {
    const place = places.find((p) => p.id === id);
    if (!place || place.is_default || !defaultPlace) return { error: "This place can't be deleted." };

    setItems((prev) => prev.map((i) => (i.category_id === id ? { ...i, category_id: defaultPlace.id } : i)));
    setPlaces((prev) => prev.filter((p) => p.id !== id));

    const payload = { id, reassignItemsToId: defaultPlace.id };
    await withOfflineQueue("groceryPlaces:delete", payload, () => offlineHandlers["groceryPlaces:delete"](payload));
    return { error: null };
  }

  async function addItem(
    name: string,
    categoryId: string | null,
    options: { itemCategory?: string; sourceMealEntryId?: string | null } = {}
  ) {
    if (!familyId || !profile) return { error: "You're not in a family yet." };
    const targetCategoryId = categoryId ?? defaultPlace?.id ?? null;
    const trimmedName = name.trim();
    const alreadyActive = activeItems.some(
      (i) => i.category_id === targetCategoryId && i.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyActive) return { error: null };

    const id = generateLocalId();
    const row = {
      name: trimmedName,
      category_id: targetCategoryId,
      item_category: options.itemCategory ?? DEFAULT_GROCERY_ITEM_CATEGORY,
      source_meal_entry_id: options.sourceMealEntryId ?? null,
    };
    const optimisticItem: GroceryItem = {
      id,
      description: null,
      is_checked: false,
      is_archived: false,
      created_by: profile.id,
      created_at: new Date().toISOString(),
      ...row,
    };
    setItems((prev) => [optimisticItem, ...prev]);

    const payload: InsertPayload = { id, familyId, createdBy: profile.id, row };
    await withOfflineQueue("groceryItems:add", payload, () => offlineHandlers["groceryItems:add"](payload));
    return { error: null };
  }

  async function updateItem(
    id: string,
    input: { name: string; categoryId: string | null; itemCategory: string; description: string | null }
  ) {
    const row = { name: input.name, category_id: input.categoryId, item_category: input.itemCategory, description: input.description };
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...row } : i)));
    const payload: UpdatePayload = { id, row };
    await withOfflineQueue("groceryItems:update", payload, () => offlineHandlers["groceryItems:update"](payload));
  }

  async function toggleItem(item: GroceryItem) {
    const nextChecked = !item.is_checked;
    const nextCheckedAt = nextChecked ? new Date().toISOString() : null;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: nextChecked, checked_at: nextCheckedAt } : i))
    );
    const payload: UpdatePayload = { id: item.id, row: { is_checked: nextChecked, checked_at: nextCheckedAt } };
    await withOfflineQueue("groceryItems:update", payload, () => offlineHandlers["groceryItems:update"](payload));
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const payload: DeletePayload = { id };
    await withOfflineQueue("groceryItems:delete", payload, () => offlineHandlers["groceryItems:delete"](payload));
  }

  // Removing an item from the active list archives it (like clearChecked)
  // instead of hard-deleting, so it still shows up as a "previously added
  // here" suggestion later. Permanent removal only happens from the place's
  // history cleanup list.
  async function removeFromList(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_archived: true } : i)));
    const payload: DeletePayload = { id };
    await withOfflineQueue("groceryItems:archiveOne", payload, () => offlineHandlers["groceryItems:archiveOne"](payload));
  }

  async function clearChecked() {
    if (!familyId) return;
    const checkedIds = new Set(items.filter((i) => i.is_checked).map((i) => i.id));
    setItems((prev) => prev.map((i) => (checkedIds.has(i.id) ? { ...i, is_archived: true } : i)));
    const payload = { familyId };
    await withOfflineQueue("groceryItems:archiveChecked", payload, () => offlineHandlers["groceryItems:archiveChecked"](payload));
  }

  function itemsForMeal(mealEntryId: string): GroceryItem[] {
    return activeItems.filter((i) => i.source_meal_entry_id === mealEntryId);
  }

  async function removeItemsForMeal(mealEntryId: string) {
    setItems((prev) => prev.map((i) => (i.source_meal_entry_id === mealEntryId ? { ...i, is_archived: true } : i)));
    const payload = { mealEntryId };
    await withOfflineQueue("groceryItems:archiveForMeal", payload, () => offlineHandlers["groceryItems:archiveForMeal"](payload));
  }

  return {
    items: activeItems,
    places,
    defaultPlace,
    isLoading,
    addPlace,
    updatePlaceIcon,
    reorderPlaces,
    renamePlace,
    deletePlace,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    removeFromList,
    clearChecked,
    itemsForMeal,
    removeItemsForMeal,
    getHistoryForPlace,
  };
}
