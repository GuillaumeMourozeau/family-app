import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { Ionicons } from "@expo/vector-icons";

export type TodoCategory = {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  created_by: string;
  created_at: string;
};

export function useTodoCategories() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();

  const [categories, setCategories] = useState<TodoCategory[]>([]);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase
      .from("todo_categories")
      .select("*")
      .order("created_at", { ascending: true });
    setCategories(data ?? []);
  }, [familyId]);

  useEffect(() => {
    refetch();
    if (!familyId) return;
    const channel = supabase
      .channel(`todo_categories:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todo_categories", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  async function addCategory(name: string, icon: keyof typeof Ionicons.glyphMap) {
    if (!familyId || !profile) return { error: "You're not in a family yet.", category: null as TodoCategory | null };
    const { data, error } = await supabase
      .from("todo_categories")
      .insert({ family_id: familyId, name, icon, created_by: profile.id })
      .select()
      .single();
    if (error || !data) return { error: error?.message ?? "Couldn't create category.", category: null };
    setCategories((prev) => [...prev, data]);
    return { error: null, category: data as TodoCategory };
  }

  return { categories, addCategory, refetch };
}
