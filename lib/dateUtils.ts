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
