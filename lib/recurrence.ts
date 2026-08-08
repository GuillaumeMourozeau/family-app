import { formatDate } from "@/lib/dateUtils";

export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";
export type RecurrenceEndType = "never" | "on_date" | "after_count";

export type RecurrenceRule = {
  freq: RecurrenceFreq;
  interval: number;
  daysOfWeek: number[] | null;
  endType: RecurrenceEndType;
  endDate: Date | null;
  count: number | null;
};

// Family-app scale, not a general-purpose RRULE engine: bounded loops are fine.
const MAX_OCCURRENCES = 1000;

function addByFreq(date: Date, freq: RecurrenceFreq, interval: number): Date {
  const d = new Date(date);
  if (freq === "daily") d.setDate(d.getDate() + interval);
  else if (freq === "weekly") d.setDate(d.getDate() + interval * 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + interval);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + interval);
  return d;
}

// Walks forward from the series' true start (not rangeStart) so end-date/count
// limits stay accurate regardless of which window is being displayed.
export function generateOccurrenceDates(
  baseStart: Date,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const dates: Date[] = [];
  let emittedTotal = 0;

  const withinEnd = (d: Date) => {
    if (rule.endType === "on_date" && rule.endDate && d > rule.endDate) return false;
    if (rule.endType === "after_count" && rule.count != null && emittedTotal >= rule.count) return false;
    return true;
  };

  if (rule.freq === "weekly" && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
    const weekStart = new Date(baseStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    let weekIndex = 0;

    for (let iter = 0; iter < MAX_OCCURRENCES; iter++) {
      if (weekStart > rangeEnd) break;
      if (weekIndex % rule.interval === 0) {
        for (const dow of sortedDays) {
          const candidate = new Date(weekStart);
          candidate.setDate(candidate.getDate() + dow);
          candidate.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
          if (candidate < baseStart) continue;
          if (!withinEnd(candidate)) return dates;
          emittedTotal++;
          if (candidate >= rangeStart && candidate < rangeEnd) dates.push(candidate);
        }
      }
      weekStart.setDate(weekStart.getDate() + 7);
      weekIndex++;
    }
  } else {
    let cursor = new Date(baseStart);
    for (let iter = 0; iter < MAX_OCCURRENCES; iter++) {
      if (cursor > rangeEnd) break;
      if (!withinEnd(cursor)) break;
      emittedTotal++;
      if (cursor >= rangeStart && cursor < rangeEnd) dates.push(new Date(cursor));
      cursor = addByFreq(cursor, rule.freq, rule.interval);
    }
  }

  return dates;
}

export type RecurringEventLike = {
  start_at: string;
  recurrence_freq: RecurrenceFreq | null;
  recurrence_interval: number;
  recurrence_days_of_week: number[] | null;
  recurrence_end_type: RecurrenceEndType | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
};

export type Occurrence<T extends RecurringEventLike> = {
  key: string;
  event: T;
  startAt: Date;
};

// Expands every event in the list into its concrete occurrences within
// [rangeStart, rangeEnd). Non-recurring events pass through unchanged.
export function expandOccurrences<T extends RecurringEventLike>(
  events: T[],
  rangeStart: Date,
  rangeEnd: Date
): Occurrence<T>[] {
  const results: Occurrence<T>[] = [];
  for (const event of events) {
    const baseStart = new Date(event.start_at);
    if (!event.recurrence_freq) {
      if (baseStart >= rangeStart && baseStart < rangeEnd) {
        results.push({ key: (event as unknown as { id: string }).id, event, startAt: baseStart });
      }
      continue;
    }

    const rule: RecurrenceRule = {
      freq: event.recurrence_freq,
      interval: Math.max(1, event.recurrence_interval || 1),
      daysOfWeek: event.recurrence_days_of_week,
      endType: event.recurrence_end_type ?? "never",
      endDate: event.recurrence_end_date ? new Date(event.recurrence_end_date) : null,
      count: event.recurrence_count,
    };

    const dates = generateOccurrenceDates(baseStart, rule, rangeStart, rangeEnd);
    const id = (event as unknown as { id: string }).id;
    dates.forEach((date, index) => {
      results.push({ key: date.getTime() === baseStart.getTime() ? id : `${id}__${index}__${date.getTime()}`, event, startAt: date });
    });
  }
  return results.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function recurrenceSummary(
  rule: {
    freq: RecurrenceFreq | null;
    interval: number;
    daysOfWeek: number[] | null;
    endType: RecurrenceEndType;
    endDate: Date | null;
    count: number | null;
  },
  t: TFunction
): string {
  if (!rule.freq) return t("calendar.doesNotRepeat");
  const everyKey = { daily: "everyDaily", weekly: "everyWeekly", monthly: "everyMonthly", yearly: "everyYearly" }[
    rule.freq
  ];
  const every = t(`calendar.${everyKey}`, { count: rule.interval });

  const dayLabels = t("calendar.weekdaysVeryShort", { returnObjects: true }) as unknown as string[];
  const days =
    rule.freq === "weekly" && rule.daysOfWeek && rule.daysOfWeek.length > 0
      ? t("calendar.onDays", {
          days: [...rule.daysOfWeek].sort((a, b) => a - b).map((d) => dayLabels[d]).join(", "),
        })
      : "";

  const end =
    rule.endType === "on_date" && rule.endDate
      ? t("calendar.untilDate", { date: formatDate(rule.endDate) })
      : rule.endType === "after_count" && rule.count
        ? t("calendar.timesCount", { count: rule.count })
        : "";

  return `${every}${days}${end}`;
}
