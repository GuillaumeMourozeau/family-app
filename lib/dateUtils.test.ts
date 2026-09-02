import { dateKeyToDate, endOfWeek, isThisWeek, isToday, startOfWeek, toDateKey } from "@/lib/dateUtils";

describe("startOfWeek", () => {
  it("returns the same Monday at midnight when given a Monday", () => {
    const monday = new Date(2026, 0, 5, 15, 30); // Jan 5, 2026 is a Monday
    const result = startOfWeek(monday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(5);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("rolls a Sunday back to the preceding Monday, not forward", () => {
    const sunday = new Date(2026, 0, 11, 8, 0); // Jan 11, 2026 is a Sunday
    const result = startOfWeek(sunday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(5);
  });

  it("rolls a mid-week date back to that week's Monday", () => {
    const thursday = new Date(2026, 0, 8);
    const result = startOfWeek(thursday);
    expect(result.getDate()).toBe(5);
  });
});

describe("endOfWeek", () => {
  it("is exactly 7 days after startOfWeek", () => {
    const date = new Date(2026, 0, 8);
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("isThisWeek", () => {
  const now = new Date(2026, 0, 8, 12, 0); // Thursday

  it("is true for another day in the same Mon-Sun week", () => {
    expect(isThisWeek(new Date(2026, 0, 5), now)).toBe(true); // Monday
    expect(isThisWeek(new Date(2026, 0, 11), now)).toBe(true); // Sunday
  });

  it("is false for a day in the following week", () => {
    expect(isThisWeek(new Date(2026, 0, 12), now)).toBe(false); // next Monday
  });

  it("is false for a day in the previous week", () => {
    expect(isThisWeek(new Date(2026, 0, 4), now)).toBe(false); // previous Sunday
  });
});

describe("isToday", () => {
  it("is true for the same calendar day regardless of time", () => {
    const now = new Date(2026, 0, 8, 23, 0);
    expect(isToday(new Date(2026, 0, 8, 0, 1), now)).toBe(true);
  });

  it("is false for a different calendar day", () => {
    const now = new Date(2026, 0, 8, 12, 0);
    expect(isToday(new Date(2026, 0, 9, 0, 0), now)).toBe(false);
  });
});

describe("toDateKey / dateKeyToDate", () => {
  it("round-trips a date through its key", () => {
    const date = new Date(2026, 2, 7); // March 7, 2026
    const key = toDateKey(date);
    expect(key).toBe("2026-03-07");
    const roundTripped = dateKeyToDate(key);
    expect(roundTripped.getFullYear()).toBe(2026);
    expect(roundTripped.getMonth()).toBe(2);
    expect(roundTripped.getDate()).toBe(7);
  });

  it("pads single-digit months and days", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
