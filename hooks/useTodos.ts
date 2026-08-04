import { useCallback, useEffect, useId, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { TodoReminder, TodoReminderFreq } from "@/lib/reminders";

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
  reminder_enabled: boolean;
  reminder_freq: TodoReminderFreq | null;
  reminder_time: string | null;
  reminder_weekday: number | null;
};

function reminderToColumns(reminder: TodoReminder | null) {
  return {
    reminder_enabled: !!reminder,
    reminder_freq: reminder?.freq ?? null,
    reminder_time: reminder?.time ?? null,
    reminder_weekday: reminder?.freq === "weekly" ? (reminder.weekday ?? 0) : null,
  };
}

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
    isPrivate: boolean = false,
    reminder: TodoReminder | null = null
  ) {
    if (!familyId || !profile) return;
    await supabase.from("todos").insert({
      family_id: familyId,
      title,
      assigned_to: assignedTo,
      priority,
      created_by: profile.id,
      is_private: isPrivate,
      ...reminderToColumns(reminder),
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
      reminder: TodoReminder | null;
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
        ...reminderToColumns(input.reminder),
      })
      .eq("id", id);
  }

  return { todos, isLoading, addTodo, toggleTodo, deleteTodo, updateTodo, refetch };
}
