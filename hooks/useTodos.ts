import { useCallback, useEffect, useId, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { TodoReminder, TodoReminderFreq } from "@/lib/reminders";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type DeletePayload, type InsertPayload, type UpdatePayload } from "@/lib/offline/handlers";
import { generateLocalId } from "@/lib/offline/id";

export type TodoPriority = "urgent" | "soon" | "whenever";

export type Todo = {
  id: string;
  title: string;
  description: string | null;
  is_complete: boolean;
  assigned_to: string | null;
  priority: TodoPriority;
  category_id: string | null;
  due_date: string | null;
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
  const cacheKey = familyId ? `todos:${familyId}` : null;

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const { data, error } = await supabase.from("todos").select("*").order("created_at", { ascending: true });
    if (error) return;
    setTodos(data ?? []);
    if (cacheKey) writeCache(cacheKey, data ?? []);
  }, [familyId, cacheKey]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (cacheKey) {
        const cached = await readCache<Todo[]>(cacheKey);
        if (cached && !cancelled) setTodos(cached);
      }
      await refetch();
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, cacheKey, refetch]);

  useEffect(() => {
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
    reminder: TodoReminder | null = null,
    categoryId: string | null = null,
    dueDate: string | null = null
  ) {
    if (!familyId || !profile) return;
    const id = generateLocalId();
    const row = {
      title,
      assigned_to: assignedTo,
      priority,
      category_id: categoryId,
      due_date: dueDate,
      is_private: isPrivate,
      ...reminderToColumns(reminder),
    };
    const optimisticTodo: Todo = { id, description: null, created_by: profile.id, created_at: new Date().toISOString(), is_complete: false, ...row };
    setTodos((prev) => [...prev, optimisticTodo]);

    const payload: InsertPayload = { id, familyId, createdBy: profile.id, row };
    await withOfflineQueue("todos:add", payload, () => offlineHandlers["todos:add"](payload));
  }

  async function toggleTodo(todo: Todo) {
    const nextComplete = !todo.is_complete;
    const nextCompletedAt = nextComplete ? new Date().toISOString() : null;
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, is_complete: nextComplete, completed_at: nextCompletedAt } : t))
    );
    const payload = { id: todo.id, isComplete: nextComplete, completedAt: nextCompletedAt };
    await withOfflineQueue("todos:toggle", payload, () => offlineHandlers["todos:toggle"](payload));
  }

  async function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    const payload: DeletePayload = { id };
    await withOfflineQueue("todos:delete", payload, () => offlineHandlers["todos:delete"](payload));
  }

  async function updateTodo(
    id: string,
    input: {
      title: string;
      assignedTo: string | null;
      priority: TodoPriority;
      categoryId: string | null;
      dueDate: string | null;
      description: string | null;
      isPrivate: boolean;
      reminder: TodoReminder | null;
    }
  ) {
    const row = {
      title: input.title,
      assigned_to: input.assignedTo,
      priority: input.priority,
      category_id: input.categoryId,
      due_date: input.dueDate,
      description: input.description,
      is_private: input.isPrivate,
      ...reminderToColumns(input.reminder),
    };
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...row } : t)));
    const payload: UpdatePayload = { id, row };
    await withOfflineQueue("todos:update", payload, () => offlineHandlers["todos:update"](payload));
  }

  return { todos, isLoading, addTodo, toggleTodo, deleteTodo, updateTodo, refetch };
}
