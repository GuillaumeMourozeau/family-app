export type EventReminderOption = { minutes: number; label: string };

// Google Calendar-style set of "before start" offsets. Multiple can be selected per event.
export const EVENT_REMINDER_OPTIONS: EventReminderOption[] = [
  { minutes: 0, label: "At start time" },
  { minutes: 5, label: "5 minutes before" },
  { minutes: 15, label: "15 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 120, label: "2 hours before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 2880, label: "2 days before" },
  { minutes: 10080, label: "1 week before" },
];

const EVENT_REMINDER_LABELS = new Map(EVENT_REMINDER_OPTIONS.map((o) => [o.minutes, o.label]));

export function eventReminderLabel(minutes: number): string {
  return EVENT_REMINDER_LABELS.get(minutes) ?? `${minutes} minutes before`;
}

export function eventReminderSummary(offsets: number[] | null): string {
  if (!offsets || offsets.length === 0) return "No reminder";
  return [...offsets]
    .sort((a, b) => a - b)
    .map(eventReminderLabel)
    .join(", ");
}

export type TodoReminderFreq = "daily" | "weekly";

export type TodoReminder = {
  freq: TodoReminderFreq;
  time: string; // "HH:MM", 24-hour, local time
  weekday: number | null; // 0-6 (Sun-Sat), required when freq === "weekly"
};

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatReminderTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function todoReminderSummary(reminder: TodoReminder | null): string {
  if (!reminder) return "No reminder";
  const time = formatReminderTime(reminder.time);
  if (reminder.freq === "daily") return `Every day at ${time}`;
  const day = WEEKDAY_LABELS[reminder.weekday ?? 0];
  return `Every ${day} at ${time}`;
}
