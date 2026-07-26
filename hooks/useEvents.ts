import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import type { RecurrenceEndType, RecurrenceFreq, RecurrenceRule } from "@/lib/recurrence";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
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

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) return;
    const [{ data: eventsData }, { data: participantsData }] = await Promise.all([
      supabase.from("events").select("*").order("start_at", { ascending: true }),
      supabase.from("event_participants").select("event_id, profile_id"),
    ]);

    const participantsByEvent = new Map<string, string[]>();
    for (const row of participantsData ?? []) {
      const list = participantsByEvent.get(row.event_id) ?? [];
      list.push(row.profile_id);
      participantsByEvent.set(row.event_id, list);
    }

    setEvents(
      (eventsData ?? []).map((e) => ({
        ...e,
        participant_ids: participantsByEvent.get(e.id) ?? [],
      }))
    );
    setIsLoading(false);
  }, [familyId]);

  useEffect(() => {
    setIsLoading(true);
    refetch();

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
    allDay: boolean;
    appliesToWholeFamily: boolean;
    participantIds: string[];
    isPrivate: boolean;
    recurrence: RecurrenceInput;
  }) {
    if (!familyId || !profile) return;

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        family_id: familyId,
        title: input.title,
        event_type: "general",
        start_at: input.startAt.toISOString(),
        all_day: input.allDay,
        applies_to_whole_family: input.appliesToWholeFamily,
        created_by: profile.id,
        is_private: input.isPrivate,
        ...recurrenceToColumns(input.recurrence),
      })
      .select()
      .single();

    if (error || !event) return;

    if (!input.appliesToWholeFamily && input.participantIds.length > 0) {
      await supabase
        .from("event_participants")
        .insert(input.participantIds.map((profileId) => ({ event_id: event.id, profile_id: profileId })));
    }
  }

  async function updateEvent(
    id: string,
    input: {
      title: string;
      startAt: Date;
      allDay: boolean;
      appliesToWholeFamily: boolean;
      participantIds: string[];
      description: string | null;
      location: string | null;
      isPrivate: boolean;
      recurrence: RecurrenceInput;
    }
  ) {
    const { error } = await supabase
      .from("events")
      .update({
        title: input.title,
        start_at: input.startAt.toISOString(),
        all_day: input.allDay,
        applies_to_whole_family: input.appliesToWholeFamily,
        description: input.description,
        location: input.location,
        is_private: input.isPrivate,
        ...recurrenceToColumns(input.recurrence),
      })
      .eq("id", id);

    if (error) return;

    await supabase.from("event_participants").delete().eq("event_id", id);
    if (!input.appliesToWholeFamily && input.participantIds.length > 0) {
      await supabase
        .from("event_participants")
        .insert(input.participantIds.map((profileId) => ({ event_id: id, profile_id: profileId })));
    }
    refetch();
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) refetch();
  }

  return { events, isLoading, addEvent, updateEvent, deleteEvent, refetch };
}
