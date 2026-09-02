import {
  dateToTimeString,
  expandTimetableWeek,
  formatTimeLabel,
  minutesFromMidnight,
  timeStringToDate,
} from "@/lib/timetable";
import type { TimetableBlock, TimetableOverride } from "@/hooks/useTimetable";

describe("timeStringToDate / dateToTimeString", () => {
  it("round-trips a HH:MM:SS string through a Date", () => {
    const date = timeStringToDate("14:30:00");
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
    expect(dateToTimeString(date)).toBe("14:30:00");
  });

  it("treats a missing seconds/minutes component as zero", () => {
    const date = timeStringToDate("09:00");
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(0);
  });
});

describe("minutesFromMidnight", () => {
  it("converts HH:MM:SS to total minutes", () => {
    expect(minutesFromMidnight("00:00:00")).toBe(0);
    expect(minutesFromMidnight("01:30:00")).toBe(90);
    expect(minutesFromMidnight("23:59:00")).toBe(1439);
  });
});

describe("formatTimeLabel", () => {
  it("does not throw and returns a non-empty string", () => {
    expect(formatTimeLabel("09:00:00").length).toBeGreaterThan(0);
  });
});

function makeBlock(overrides: Partial<TimetableBlock> = {}): TimetableBlock {
  return {
    id: "block-1",
    profile_id: "profile-1",
    applies_to_whole_family: false,
    days_of_week: [0], // Monday
    start_time: "09:00:00",
    end_time: "17:00:00",
    label: "Work",
    created_by: "profile-1",
    ...overrides,
  };
}

const MONDAY = new Date(2026, 0, 5); // matches startOfWeek's Monday convention

describe("expandTimetableWeek", () => {
  it("produces one occurrence per day for a block spanning multiple days", () => {
    const block = makeBlock({ days_of_week: [0, 2, 4] }); // Mon, Wed, Fri
    const occurrences = expandTimetableWeek([block], [], MONDAY);
    expect(occurrences).toHaveLength(3);
    expect(occurrences.map((o) => o.date.getDate())).toEqual([5, 7, 9]);
  });

  it("applies an override's custom time and label to that specific day", () => {
    const block = makeBlock({ days_of_week: [0] });
    const override: TimetableOverride = {
      id: "override-1",
      block_id: block.id,
      override_date: "2026-01-05",
      is_cancelled: false,
      start_time: "10:00:00",
      end_time: "11:00:00",
      label: "Dentist",
    };
    const occurrences = expandTimetableWeek([block], [override], MONDAY);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].startTime).toBe("10:00:00");
    expect(occurrences[0].label).toBe("Dentist");
    expect(occurrences[0].isOverridden).toBe(true);
  });

  it("excludes a day cancelled via an override", () => {
    const block = makeBlock({ days_of_week: [0, 2] });
    const override: TimetableOverride = {
      id: "override-1",
      block_id: block.id,
      override_date: "2026-01-05",
      is_cancelled: true,
      start_time: null,
      end_time: null,
      label: null,
    };
    const occurrences = expandTimetableWeek([block], [override], MONDAY);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].date.getDate()).toBe(7); // only the Wednesday remains
  });

  it("falls back to the block's own time/label when there is no override", () => {
    const block = makeBlock();
    const occurrences = expandTimetableWeek([block], [], MONDAY);
    expect(occurrences[0].startTime).toBe("09:00:00");
    expect(occurrences[0].isOverridden).toBe(false);
  });
});
