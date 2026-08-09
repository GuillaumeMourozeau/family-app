import type { TimetableBlock, TimetableOverride } from "@/hooks/useTimetable";
import { formatTime } from "@/lib/dateUtils";

export type TimetableOccurrence = {
  key: string;
  blockId: string;
  profileId: string | null;
  appliesToWholeFamily: boolean;
  date: Date;
  startTime: string;
  endTime: string;
  label: string;
  isOverridden: boolean;
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "HH:MM:SS" or "HH:MM" <-> a Date carrying just that time-of-day, for use
// with <DateTimePicker mode="time">. The calendar date part is irrelevant.
export function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function dateToTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}:00`;
}

export function formatTimeLabel(time: string): string {
  return formatTime(timeStringToDate(time), { hour: "2-digit", minute: "2-digit" });
}

export function minutesFromMidnight(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// weekStart must be a Monday (see lib/dateUtils#startOfWeek). Produces one
// occurrence per (block, day-in-week) pair, applying any override for that
// exact date — skipping it entirely if the override cancels that occurrence.
export function expandTimetableWeek(
  blocks: TimetableBlock[],
  overrides: TimetableOverride[],
  weekStart: Date
): TimetableOccurrence[] {
  const overrideByKey = new Map<string, TimetableOverride>();
  for (const o of overrides) {
    overrideByKey.set(`${o.block_id}:${o.override_date}`, o);
  }

  const occurrences: TimetableOccurrence[] = [];
  for (const block of blocks) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + block.day_of_week);
    const dateKey = toDateKey(date);
    const override = overrideByKey.get(`${block.id}:${dateKey}`);
    if (override?.is_cancelled) continue;
    occurrences.push({
      key: `${block.id}:${dateKey}`,
      blockId: block.id,
      profileId: block.profile_id,
      appliesToWholeFamily: block.applies_to_whole_family,
      date,
      startTime: override?.start_time ?? block.start_time,
      endTime: override?.end_time ?? block.end_time,
      label: override?.label ?? block.label,
      isOverridden: !!override,
    });
  }
  return occurrences;
}
