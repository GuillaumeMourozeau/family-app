import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useProfile } from "@/hooks/useProfile";
import { useTodos, type Todo } from "@/hooks/useTodos";
import { useEvents, type CalendarEvent } from "@/hooks/useEvents";
import { expandOccurrences } from "@/lib/recurrence";

// iOS caps an app at ~64 pending local notifications; leave headroom since
// this budget is shared with anything else the app might schedule.
const MAX_SCHEDULED_REMINDERS = 55;
const EVENT_LOOKAHEAD_DAYS = 60;
const MAX_OCCURRENCES_PER_EVENT = 8;

type DesiredReminder = {
  identifier: string;
  content: Notifications.NotificationContentInput;
  trigger: Notifications.SchedulableNotificationTriggerInput;
  repeating: boolean;
  sortKey: number;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function eventReminderBody(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "Starting now";
  if (offsetMinutes < 60) return `Starts in ${offsetMinutes} min`;
  if (offsetMinutes < 1440) return `Starts in ${Math.round(offsetMinutes / 60)} hr`;
  const days = Math.round(offsetMinutes / 1440);
  return `Starts in ${days} day${days > 1 ? "s" : ""}`;
}

function buildTodoReminder(todo: Todo, profileId: string): DesiredReminder | null {
  if (todo.is_complete || !todo.reminder_enabled || !todo.reminder_freq || !todo.reminder_time) return null;
  const concernedId = todo.assigned_to ?? todo.created_by;
  if (concernedId !== profileId) return null;

  const [hour, minute] = todo.reminder_time.split(":").map(Number);
  const trigger: Notifications.SchedulableNotificationTriggerInput =
    todo.reminder_freq === "daily"
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute }
      : {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // Native weekday is 1-7 (Sunday = 1); ours is stored 0-6 (Sunday = 0).
          weekday: (todo.reminder_weekday ?? 0) + 1,
          hour,
          minute,
        };

  return {
    identifier: `todo-${todo.id}`,
    content: { title: "To-do reminder", body: todo.title },
    trigger,
    repeating: true,
    sortKey: 0,
  };
}

function buildEventReminders(event: CalendarEvent, profileId: string, now: Date): DesiredReminder[] {
  const concerned = event.applies_to_whole_family || event.participant_ids.includes(profileId);
  const offsets = event.reminder_offsets_minutes;
  if (!concerned || !offsets || offsets.length === 0) return [];

  const occurrences = event.recurrence_freq
    ? expandOccurrences([event], now, addDays(now, EVENT_LOOKAHEAD_DAYS))
        .slice(0, MAX_OCCURRENCES_PER_EVENT)
        .map((o) => o.startAt)
    : [new Date(event.start_at)];

  const reminders: DesiredReminder[] = [];
  for (const occStart of occurrences) {
    for (const offset of offsets) {
      const fireDate = new Date(occStart.getTime() - offset * 60_000);
      if (fireDate <= now) continue;
      reminders.push({
        identifier: `event-${event.id}-${occStart.getTime()}-${offset}`,
        content: { title: event.title, body: eventReminderBody(offset) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
        repeating: false,
        sortKey: fireDate.getTime(),
      });
    }
  }
  return reminders;
}

async function reconcile(profileId: string, todos: Todo[], events: CalendarEvent[]) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const now = new Date();
    const desired: DesiredReminder[] = [];
    for (const todo of todos) {
      const reminder = buildTodoReminder(todo, profileId);
      if (reminder) desired.push(reminder);
    }
    for (const event of events) {
      desired.push(...buildEventReminders(event, profileId, now));
    }

    // Repeating todo reminders are one native registration each and always kept;
    // one-off event reminders are capped and trimmed to the soonest first so the
    // combined total stays within the platform's pending-notification budget.
    const repeating = desired.filter((d) => d.repeating);
    const oneShot = desired
      .filter((d) => !d.repeating)
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(0, Math.max(0, MAX_SCHEDULED_REMINDERS - repeating.length));
    const kept = [...repeating, ...oneShot];
    const keptIds = new Set(kept.map((d) => d.identifier));

    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const ours = existing.filter((n) => n.identifier.startsWith("todo-") || n.identifier.startsWith("event-"));
    await Promise.all(
      ours.filter((n) => !keptIds.has(n.identifier)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    await Promise.all(
      kept.map((d) =>
        Notifications.scheduleNotificationAsync({ identifier: d.identifier, content: d.content, trigger: d.trigger })
      )
    );
  } catch (err) {
    console.warn("Failed to reconcile reminder notifications", err);
  }
}

// Schedules/cancels local device notifications for todos and events the
// current member is concerned by. Runs per-device (not server-side) so each
// family member's phone only ever nags about what's relevant to them.
export function useReminderScheduler() {
  const { profile } = useProfile();
  const { todos } = useTodos();
  const { events } = useEvents();

  useEffect(() => {
    if (!profile) return;
    reconcile(profile.id, todos, events);
  }, [profile, todos, events]);
}
