import { formatTime } from "@/lib/dateUtils";

type TFunction = (key: string, options?: Record<string, unknown>) => string;

// Google Calendar-style set of "before start" offsets. Multiple can be selected per event.
export const EVENT_REMINDER_MINUTES: number[] = [0, 5, 15, 30, 60, 120, 1440, 2880, 10080];

export function eventReminderLabel(minutes: number, t: TFunction): string {
  if (minutes === 0) return t("calendar.reminderAtStart");
  if (minutes % 10080 === 0) return t("calendar.reminderWeeksBefore", { count: minutes / 10080 });
  if (minutes % 1440 === 0) return t("calendar.reminderDaysBefore", { count: minutes / 1440 });
  if (minutes % 60 === 0) return t("calendar.reminderHoursBefore", { count: minutes / 60 });
  return t("calendar.reminderMinutesBefore", { count: minutes });
}

export function eventReminderSummary(offsets: number[] | null, t: TFunction): string {
  if (!offsets || offsets.length === 0) return t("calendar.noReminder");
  return [...offsets]
    .sort((a, b) => a - b)
    .map((m) => eventReminderLabel(m, t))
    .join(", ");
}

export type TodoReminderFreq = "daily" | "weekly";

export type TodoReminder = {
  freq: TodoReminderFreq;
  time: string; // "HH:MM", 24-hour, local time
  weekday: number | null; // 0-6 (Sun-Sat), required when freq === "weekly"
};

export function formatReminderTime(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return formatTime(d, { hour: "numeric", minute: "2-digit" });
}

export function todoReminderSummary(reminder: TodoReminder | null, t: TFunction): string {
  if (!reminder) return t("todo.noReminder");
  const time = formatReminderTime(reminder.time);
  if (reminder.freq === "daily") return t("todo.reminderEveryDayAt", { time });
  const weekdayLabels = t("common.weekdaysVeryShort", { returnObjects: true }) as unknown as string[];
  const day = weekdayLabels[reminder.weekday ?? 0];
  return t("todo.reminderEveryWeekdayAt", { day, time });
}
