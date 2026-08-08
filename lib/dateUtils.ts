import i18n from "@/lib/i18n";

function localeTag(): string {
  return i18n.language === "fr" ? "fr-FR" : "en-US";
}

export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString(localeTag(), options);
}

export function formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleTimeString(localeTag(), options);
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

export function isThisWeek(date: Date, now: Date = new Date()): boolean {
  const start = startOfWeek(now);
  const end = endOfWeek(now);
  return date >= start && date < end;
}

export function isToday(date: Date, now: Date = new Date()): boolean {
  return date.toDateString() === now.toDateString();
}

// "YYYY-MM-DD" in local time, matching Postgres `date` columns.
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateKeyToDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}
