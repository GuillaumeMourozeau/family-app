import { expandOccurrences, generateOccurrenceDates, type RecurringEventLike, type RecurrenceRule } from "@/lib/recurrence";

// Jan 4, 2026 is a Sunday and Jan 5 is the following Monday — stable
// reference dates so tests don't depend on "today". Calendar-event
// recurrence's daysOfWeek is Sunday-first (0=Sun..6=Sat) — NOT the same
// Monday-first convention timetable blocks use — so tests below are
// anchored on a Sunday to keep the math easy to follow.
const SUN = (hour = 9, minute = 0) => new Date(2026, 0, 4, hour, minute);
const WED = (hour = 9, minute = 0) => new Date(2026, 0, 7, hour, minute);
const daysLater = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

function baseRule(overrides: Partial<RecurrenceRule> = {}): RecurrenceRule {
  return {
    freq: "daily",
    interval: 1,
    daysOfWeek: null,
    endType: "never",
    endDate: null,
    count: null,
    ...overrides,
  };
}

describe("generateOccurrenceDates", () => {
  it("emits one occurrence per day for a daily rule within range", () => {
    const dates = generateOccurrenceDates(SUN(), baseRule(), SUN(), daysLater(SUN(), 5));
    expect(dates).toHaveLength(5);
    expect(dates[0].getDate()).toBe(4);
    expect(dates[4].getDate()).toBe(8);
  });

  // Regression: "after N times" used to repeat forever because `count`
  // stayed null until the user typed into the field, and the end-check
  // silently no-op'd whenever count was null. Once count is set, it must
  // actually cap the total number of occurrences ever emitted — not just
  // within one visible window, since a wide-enough range would otherwise
  // still produce more than `count` dates.
  it("stops after exactly `count` occurrences when endType is after_count", () => {
    const rule = baseRule({ endType: "after_count", count: 3 });
    const dates = generateOccurrenceDates(SUN(), rule, SUN(), daysLater(SUN(), 365));
    expect(dates).toHaveLength(3);
  });

  it("stops emitting once past the end date for endType on_date", () => {
    const rule = baseRule({ endType: "on_date", endDate: daysLater(SUN(), 2) });
    const dates = generateOccurrenceDates(SUN(), rule, SUN(), daysLater(SUN(), 365));
    expect(dates).toHaveLength(3); // day 0, 1, 2 — inclusive of the end date
  });

  it("only emits the selected weekdays for a weekly rule", () => {
    const rule = baseRule({ freq: "weekly", daysOfWeek: [0, 2, 4] }); // Sun/Tue/Thu
    const dates = generateOccurrenceDates(SUN(), rule, SUN(), daysLater(SUN(), 7));
    expect(dates.map((d) => d.getDay())).toEqual([0, 2, 4]);
  });

  it("skips weeks according to interval for a weekly rule", () => {
    const rule = baseRule({ freq: "weekly", interval: 2, daysOfWeek: [0] }); // every other Sunday
    const dates = generateOccurrenceDates(SUN(), rule, SUN(), daysLater(SUN(), 28));
    expect(dates.map((d) => d.getDate())).toEqual([4, 18]);
  });

  it("does not emit a weekday that falls before the series' own start, even in its first week", () => {
    // Series starts Wednesday; Sunday is earlier in that same calendar
    // week and must not produce a "before the series started" occurrence.
    const rule = baseRule({ freq: "weekly", daysOfWeek: [0, 3] }); // Sun, Wed
    const dates = generateOccurrenceDates(WED(), rule, daysLater(WED(), -7), daysLater(WED(), 7));
    expect(dates.every((d) => d >= WED())).toBe(true);
    expect(dates.map((d) => d.getDate())).toEqual([7, 11]); // Wed(7), then Sun(11) the following week
  });
});

type FakeEvent = RecurringEventLike & { id: string };

function makeEvent(overrides: Partial<FakeEvent> & { id: string; start_at: string; end_at: string }): FakeEvent {
  return {
    recurrence_freq: null,
    recurrence_interval: 1,
    recurrence_days_of_week: null,
    recurrence_end_type: null,
    recurrence_end_date: null,
    recurrence_count: null,
    ...overrides,
  };
}

describe("expandOccurrences", () => {
  // Regression: a multi-day event only used to show up if its *start*
  // fell inside the visible range, so a trip spanning a month boundary
  // (e.g. Aug 30 – Sep 2) disappeared entirely once you navigated to
  // September even though it was still ongoing.
  it("includes a non-recurring multi-day event that started before the range but is still ongoing", () => {
    const event = makeEvent({
      id: "trip",
      start_at: new Date(2026, 7, 30).toISOString(), // Aug 30
      end_at: new Date(2026, 8, 2).toISOString(), // Sep 2
    });
    const septemberStart = new Date(2026, 8, 1);
    const septemberEnd = new Date(2026, 8, 30);
    const results = expandOccurrences([event], septemberStart, septemberEnd);
    expect(results).toHaveLength(1);
    expect(results[0].event.id).toBe("trip");
  });

  it("excludes a non-recurring event entirely outside the range", () => {
    const event = makeEvent({
      id: "past",
      start_at: new Date(2026, 0, 1).toISOString(),
      end_at: new Date(2026, 0, 2).toISOString(),
    });
    const results = expandOccurrences([event], new Date(2026, 5, 1), new Date(2026, 5, 30));
    expect(results).toHaveLength(0);
  });

  it("carries the event's duration onto each recurring occurrence", () => {
    const event = makeEvent({
      id: "standup",
      start_at: SUN(9, 0).toISOString(),
      end_at: SUN(9, 30).toISOString(),
      recurrence_freq: "daily",
      recurrence_interval: 1,
    });
    const results = expandOccurrences([event], SUN(), daysLater(SUN(), 3));
    expect(results.length).toBeGreaterThan(0);
    for (const occ of results) {
      expect(occ.endAt.getTime() - occ.startAt.getTime()).toBe(30 * 60 * 1000);
    }
  });

  it("includes a multi-day recurring occurrence that started just before the range", () => {
    // A 2-day recurring event starting the day before rangeStart should
    // still be picked up, since it overlaps into the visible range.
    const event = makeEvent({
      id: "recurring-trip",
      start_at: new Date(2026, 0, 3, 12, 0).toISOString(), // Saturday before SUN
      end_at: new Date(2026, 0, 5, 12, 0).toISOString(), // 2 days later
      recurrence_freq: "weekly",
      recurrence_interval: 1,
      recurrence_days_of_week: [6], // Saturday, matching baseStart's own weekday
    });
    const results = expandOccurrences([event], SUN(0, 0), daysLater(SUN(), 1));
    expect(results.length).toBeGreaterThan(0);
  });
});
