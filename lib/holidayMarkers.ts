import { getFrenchPublicHolidaysInRange, getSchoolHolidaysInRange, type SchoolZone } from "@/lib/frenchHolidays";

export type HolidayMarker = { date: Date; name: string; color: string; type: "public" | "school" };

export function getHolidayMarkers(
  rangeStart: Date,
  rangeEnd: Date,
  options: {
    showPublicHolidays: boolean;
    showSchoolHolidays: boolean;
    schoolZone: SchoolZone | null;
    holidayColor: string;
  }
): HolidayMarker[] {
  const markers: HolidayMarker[] = [];

  if (options.showPublicHolidays) {
    for (const h of getFrenchPublicHolidaysInRange(rangeStart, rangeEnd)) {
      markers.push({ date: h.date, name: h.name, color: options.holidayColor, type: "public" });
    }
  }

  if (options.showSchoolHolidays && options.schoolZone) {
    for (const period of getSchoolHolidaysInRange(options.schoolZone, rangeStart, rangeEnd)) {
      const cursor = new Date(Math.max(new Date(period.start).getTime(), rangeStart.getTime()));
      const end = new Date(Math.min(new Date(period.end).getTime(), rangeEnd.getTime() - 1));
      while (cursor <= end) {
        markers.push({ date: new Date(cursor), name: period.name, color: options.holidayColor, type: "school" });
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  return markers;
}
