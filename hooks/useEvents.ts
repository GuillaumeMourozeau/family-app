import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { RecurrenceEndType, RecurrenceFreq, RecurrenceRule } from "@/lib/recurrence";
import { readCache, writeCache } from "@/lib/offline/cache";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type EventDeletePayload, type EventInsertPayload, type EventUpdatePayload } from "@/lib/offline/handlers";
import { generateLocalId } from "@/lib/offline/id";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  applies_to_whole_family: boolean;
  created_by: string;
  created_at: string;
  participant_ids: string[];
  is_private: boolean;
  recurrence_freq: RecurrenceFreq | null;
  recurrence_interval: number;
  recurrence_days_of_week: number[] | null;
  recurrence_end_type: RecurrenceEndType | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  reminder_offsets_minutes: number[] | null;
};

export type RecurrenceInput = RecurrenceRule | null;

function recurrenceToColumns(recurrence: RecurrenceInput) {
  if (!recurrence) {
    return {
      recurrence_freq: null,
      recurrence_interval: 1,
      recurrence_days_of_week: null,
      recurrence_end_type: null,
      recurrence_end_date: null,
      recurrence_count: null,
    };
  }
  return {
    recurrence_freq: recurrence.freq,
    recurrence_interval: recurrence.interval,
    recurrence_days_of_week: recurrence.daysOfWeek,
    recurrence_end_type: recurrence.endType,
    recurrence_end_date: recurrence.endDate ? recurrence.endDate.toISOString() : null,
    recurrence_count: recurrence.count,
  };
}

export function useEvents() {
  const { profile } = useProfile();
  const familyId = profile?.family_id;
  const instanceId = useId();
  const cacheKey = familyId ? `events:${familyId}` : null;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const [{ data: eventsData, error }, { data: participantsData }] = await Promise.all([
      supabase.from("events").select("*").order("start_at", { ascending: true }),
      supabase.from("event_participants").select("event_id, profile_id"),
    ]);
    if (error) return; // offline or request failed — keep showing cached/local state

    const participantsByEvent = new Map<string, string[]>();
    for (const row of participantsData ?? []) {
      const list = participantsByEvent.get(row.event_id) ?? [];
      list.push(row.profile_id);
      participantsByEvent.set(row.event_id, list);
    }

    const next = (eventsData ?? []).map((e) => ({
      ...e,
      participant_ids: participantsByEvent.get(e.id) ?? [],
    }));
    setEvents(next);
    if (cacheKey) writeCache(cacheKey, next);
  }, [familyId, cacheKey]);

  useEffect(() => {
    setIsLoading(true);
    let cancelled = false;
    (async () => {
      if (cacheKey) {
        const cached = await readCache<CalendarEvent[]>(cacheKey);
        if (cached && !cancelled) setEvents(cached);
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
      .channel(`events:${familyId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `family_id=eq.${familyId}` },
        () => refetch()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "event_participants" }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, refetch, instanceId]);

  async function addEvent(input: {
    title: string;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    appliesToWholeFamily: boolean;
    participantIds: string[];
    isPrivate: boolean;
    recurrence: RecurrenceInput;
    reminderOffsetsMinutes: number[];
  }) {
    if (!familyId || !profile) return;

    const id = generateLocalId();
    const row = {
      title: input.title,
      event_type: "general",
      start_at: input.startAt.toISOString(),
      end_at: input.endAt.toISOString(),
      all_day: input.allDay,
      applies_to_whole_family: input.appliesToWholeFamily,
      is_private: input.isPrivate,
      reminder_offsets_minutes: input.reminderOffsetsMinutes.length > 0 ? input.reminderOffsetsMinutes : null,
      ...recurrenceToColumns(input.recurrence),
    };
    const optimisticEvent: CalendarEvent = {
      id,
      description: null,
      location: null,
      created_by: profile.id,
      created_at: new Date().toISOString(),
      participant_ids: input.appliesToWholeFamily ? [] : input.participantIds,
      ...row,
    };
    setEvents((prev) => [...prev, optimisticEvent].sort((a, b) => a.start_at.localeCompare(b.start_at)));

    const payload: EventInsertPayload = {
      id,
      familyId,
      createdBy: profile.id,
      row,
      participantIds: input.participantIds,
      appliesToWholeFamily: input.appliesToWholeFamily,
    };
    await withOfflineQueue("events:add", payload, () => offlineHandlers["events:add"](payload));
  }

  async function updateEvent(
    id: string,
    input: {
      title: string;
      startAt: Date;
      endAt: Date;
      allDay: boolean;
      appliesToWholeFamily: boolean;
      participantIds: string[];
      description: string | null;
      location: string | null;
      isPrivate: boolean;
      recurrence: RecurrenceInput;
      reminderOffsetsMinutes: number[];
    }
  ) {
    const row = {
      title: input.title,
      start_at: input.startAt.toISOString(),
      end_at: input.endAt.toISOString(),
      all_day: input.allDay,
      applies_to_whole_family: input.appliesToWholeFamily,
      description: input.description,
      location: input.location,
      is_private: input.isPrivate,
      reminder_offsets_minutes: input.reminderOffsetsMinutes.length > 0 ? input.reminderOffsetsMinutes : null,
      ...recurrenceToColumns(input.recurrence),
    };
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, ...row, participant_ids: input.appliesToWholeFamily ? [] : input.participantIds } : e
      )
    );

    const payload: EventUpdatePayload = {
      id,
      row,
      participantIds: input.participantIds,
      appliesToWholeFamily: input.appliesToWholeFamily,
    };
    await withOfflineQueue("events:update", payload, () => offlineHandlers["events:update"](payload));
    refetch();
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    const payload: EventDeletePayload = { id };
    await withOfflineQueue("events:delete", payload, () => offlineHandlers["events:delete"](payload));
  }

  return { events, isLoading, addEvent, updateEvent, deleteEvent, refetch };
}
