import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export type GroceryPlace = {
  id: string;
  name: string;
  is_default: boolean;
};

export type GroceryItem = {
  id: string;
  name: string;
  description: string | null;
  is_checked: boolean;
  is_archived: boolean;
  category_id: string | null;
  created_at: string;
  created_by: string;
};

export type GroceryHistoryEntry = { id: string; name: string };

const DUPLICATE_ERROR_CODE = "23505";

export function useGroceries() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [places, setPlaces] = useState<GroceryPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const [{ data: itemsData }, { data: placesData }] = await Promise.all([
      supabase
        .from("grocery_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("grocery_categories").select("*").order("created_at", { ascending: true }),
    ]);
    setItems(itemsData ?? []);
    setPlaces(placesData ?? []);
    setIsLoading(false);
  }, [familyId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();

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
      list.push({ id: item.id, name: item.name });
      historyMap.set(key, list);
    }
    return historyMap;
  }, [items]);

  function getHistoryForPlace(categoryId: string | null) {
    return historyByPlace.get(categoryId ?? "") ?? [];
  }

  async function addPlace(name: string) {
    if (!familyId) return null;
    const { data, error } = await supabase
      .from("grocery_categories")
      .insert({ family_id: familyId, name })
      .select()
      .single();
    if (error || !data) return null;
    setPlaces((prev) => [...prev, data]);
    return data;
  }

  async function renamePlace(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name can't be empty." };
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    const { error } = await supabase.from("grocery_categories").update({ name: trimmed }).eq("id", id);
    if (error) {
      refetch();
      return { error: error.message };
    }
    return { error: null };
  }

  async function deletePlace(id: string) {
    const place = places.find((p) => p.id === id);
    if (!place || place.is_default || !defaultPlace) return { error: "This place can't be deleted." };

    setItems((prev) => prev.map((i) => (i.category_id === id ? { ...i, category_id: defaultPlace.id } : i)));
    setPlaces((prev) => prev.filter((p) => p.id !== id));

    await supabase.from("grocery_items").update({ category_id: defaultPlace.id }).eq("category_id", id);
    const { error } = await supabase.from("grocery_categories").delete().eq("id", id);
    if (error) {
      refetch();
      return { error: error.message };
    }
    return { error: null };
  }

  async function addItem(name: string, categoryId: string | null) {
    if (!familyId || !profile) return { error: "You're not in a family yet." };
    const targetCategoryId = categoryId ?? defaultPlace?.id ?? null;
    const trimmedName = name.trim();
    const alreadyActive = activeItems.some(
      (i) => i.category_id === targetCategoryId && i.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (alreadyActive) return { error: null };
    const { data, error } = await supabase
      .from("grocery_items")
      .insert({
        family_id: familyId,
        name: trimmedName,
        category_id: targetCategoryId,
        created_by: profile.id,
      })
      .select()
      .single();
    if (error) {
      if (error.code === DUPLICATE_ERROR_CODE) {
        refetch();
        return { error: null };
      }
      return { error: error.message };
    }
    if (data) setItems((prev) => [data, ...prev]);
    return { error: null };
  }

  async function updateItem(
    id: string,
    input: { name: string; categoryId: string | null; description: string | null }
  ) {
    await supabase
      .from("grocery_items")
      .update({ name: input.name, category_id: input.categoryId, description: input.description })
      .eq("id", id);
  }

  async function toggleItem(item: GroceryItem) {
    const nextChecked = !item.is_checked;
    const nextCheckedAt = nextChecked ? new Date().toISOString() : null;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_checked: nextChecked, checked_at: nextCheckedAt } : i))
    );
    const { error } = await supabase
      .from("grocery_items")
      .update({ is_checked: nextChecked, checked_at: nextCheckedAt })
      .eq("id", item.id);
    if (error) refetch();
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from("grocery_items").delete().eq("id", id);
    if (error) refetch();
  }

  // Removing an item from the active list archives it (like clearChecked)
  // instead of hard-deleting, so it still shows up as a "previously added
  // here" suggestion later. Permanent removal only happens from the place's
  // history cleanup list.
  async function removeFromList(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_archived: true } : i)));
    const { error } = await supabase.from("grocery_items").update({ is_archived: true }).eq("id", id);
    if (error) refetch();
  }

  async function clearChecked() {
    if (!familyId) return;
    const checkedIds = new Set(items.filter((i) => i.is_checked).map((i) => i.id));
    setItems((prev) => prev.map((i) => (checkedIds.has(i.id) ? { ...i, is_archived: true } : i)));
    const { error } = await supabase
      .from("grocery_items")
      .update({ is_archived: true })
      .eq("family_id", familyId)
      .eq("is_checked", true);
    if (error) refetch();
  }

  return {
    items: activeItems,
    places,
    defaultPlace,
    isLoading,
    addPlace,
    renamePlace,
    deletePlace,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    removeFromList,
    clearChecked,
    getHistoryForPlace,
  };
}
