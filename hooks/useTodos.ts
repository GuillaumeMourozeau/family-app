import { useCallback, useEffect, useId, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export type TodoPriority = "urgent" | "soon" | "whenever";

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  is_complete: boolean;
  assigned_to: string | null;
  priority: TodoPriority;
  created_at: string;
  is_private: boolean;
  created_by: string;
};

export function useTodos() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data } = await supabase.from("todos").select("*").order("created_at", { ascending: true });
    setTodos(data ?? []);
    setIsLoading(false);
  }, [familyId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();

    if (!familyId) return;

    const channel = supabase
      .channel(`todos:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  async function addTodo(
    title: string,
    assignedTo: string | null,
    priority: TodoPriority,
    isPrivate: boolean = false
  ) {
    if (!familyId || !profile) return;
    await supabase.from("todos").insert({
      family_id: familyId,
      title,
      assigned_to: assignedTo,
      priority,
      created_by: profile.id,
      is_private: isPrivate,
    });
  }

  async function toggleTodo(todo: Todo) {
    const nextComplete = !todo.is_complete;
    const nextCompletedAt = nextComplete ? new Date().toISOString() : null;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, is_complete: nextComplete, completed_at: nextCompletedAt } : t))
    );
    const { error } = await supabase
      .from("todos")
      .update({ is_complete: nextComplete, completed_at: nextCompletedAt })
      .eq("id", todo.id);
    if (error) refetch();
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) refetch();
  }

  async function updateTodo(
    id: string,
    input: {
      title: string;
      assignedTo: string | null;
      priority: TodoPriority;
      description: string | null;
      isPrivate: boolean;
    }
  ) {
    await supabase
      .from("todos")
      .update({
        title: input.title,
        assigned_to: input.assignedTo,
        priority: input.priority,
        description: input.description,
        is_private: input.isPrivate,
      })
      .eq("id", id);
  }

  return { todos, isLoading, addTodo, toggleTodo, deleteTodo, updateTodo, refetch };
}
