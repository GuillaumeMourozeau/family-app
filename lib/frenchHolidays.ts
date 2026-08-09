// Verified against education.gouv.fr: 2025-2026 (service-public.gouv.fr),
// 2026-2027 (arrêté published 23 Oct 2025), and 2027-2028 (arrêté published
// 23 Jul 2026) — the French Ministry of Education only publishes each
// school year's calendar roughly 1-2 years ahead, so 2028-2029 onward
// genuinely isn't set yet by anyone, including the government itself.
// Covers through summer 2028; that final "Été" end date is an estimate
// (first-week-of-September pattern) since the 2028-2029 back-to-school
// date isn't published yet.

export type SchoolZone = "A" | "B" | "C";

export type SchoolHolidayPeriod = {
  name: string;
  zone: SchoolZone | "ALL";
  start: string; // ISO date, inclusive
  end: string; // ISO date, inclusive
};

export const FRENCH_SCHOOL_HOLIDAYS: SchoolHolidayPeriod[] = [
  // 2025-2026
  { name: "Toussaint", zone: "ALL", start: "2025-10-18", end: "2025-11-03" },
  { name: "Noël", zone: "ALL", start: "2025-12-20", end: "2026-01-05" },
  { name: "Hiver", zone: "A", start: "2026-02-07", end: "2026-02-23" },
  { name: "Hiver", zone: "B", start: "2026-02-14", end: "2026-03-02" },
  { name: "Hiver", zone: "C", start: "2026-02-21", end: "2026-03-09" },
  { name: "Printemps", zone: "A", start: "2026-04-04", end: "2026-04-20" },
  { name: "Printemps", zone: "B", start: "2026-04-11", end: "2026-04-27" },
  { name: "Printemps", zone: "C", start: "2026-04-18", end: "2026-05-04" },
  { name: "Été", zone: "ALL", start: "2026-07-04", end: "2026-09-01" },
  // 2026-2027
  { name: "Toussaint", zone: "ALL", start: "2026-10-17", end: "2026-11-02" },
  { name: "Noël", zone: "ALL", start: "2026-12-19", end: "2027-01-04" },
  { name: "Hiver", zone: "A", start: "2027-02-13", end: "2027-03-01" },
  { name: "Hiver", zone: "B", start: "2027-02-20", end: "2027-03-08" },
  { name: "Hiver", zone: "C", start: "2027-02-06", end: "2027-02-22" },
  { name: "Printemps", zone: "A", start: "2027-04-10", end: "2027-04-26" },
  { name: "Printemps", zone: "B", start: "2027-04-17", end: "2027-05-03" },
  { name: "Printemps", zone: "C", start: "2027-04-03", end: "2027-04-19" },
  { name: "Été", zone: "ALL", start: "2027-07-03", end: "2027-09-01" },
  // 2027-2028
  { name: "Toussaint", zone: "ALL", start: "2027-10-23", end: "2027-11-08" },
  { name: "Noël", zone: "ALL", start: "2027-12-18", end: "2028-01-03" },
  { name: "Hiver", zone: "A", start: "2028-02-19", end: "2028-03-06" },
  { name: "Hiver", zone: "B", start: "2028-02-05", end: "2028-02-21" },
  { name: "Hiver", zone: "C", start: "2028-02-12", end: "2028-02-28" },
  { name: "Printemps", zone: "A", start: "2028-04-22", end: "2028-05-09" },
  { name: "Printemps", zone: "B", start: "2028-04-08", end: "2028-04-24" },
  { name: "Printemps", zone: "C", start: "2028-04-15", end: "2028-05-02" },
  // 2028-2029 back-to-school date isn't published yet; estimated.
  { name: "Été", zone: "ALL", start: "2028-07-04", end: "2028-09-01" },
];

export function getSchoolHolidaysInRange(zone: SchoolZone, rangeStart: Date, rangeEnd: Date): SchoolHolidayPeriod[] {
  return FRENCH_SCHOOL_HOLIDAYS.filter((period) => period.zone === zone || period.zone === "ALL").filter(
    (period) => new Date(period.end) >= rangeStart && new Date(period.start) < rangeEnd
  );
}

export type PublicHoliday = { date: Date; name: string };

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Meeus/Jones/Butcher Gregorian algorithm for Easter Sunday.
function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function getFrenchPublicHolidays(year: number): PublicHoliday[] {
  const easter = computeEasterSunday(year);
  return [
    { date: new Date(year, 0, 1), name: "Jour de l'An" },
    { date: addDays(easter, 1), name: "Lundi de Pâques" },
    { date: new Date(year, 4, 1), name: "Fête du Travail" },
    { date: new Date(year, 4, 8), name: "Victoire 1945" },
    { date: addDays(easter, 39), name: "Ascension" },
    { date: addDays(easter, 50), name: "Lundi de Pentecôte" },
    { date: new Date(year, 6, 14), name: "Fête Nationale" },
    { date: new Date(year, 7, 15), name: "Assomption" },
    { date: new Date(year, 10, 1), name: "Toussaint" },
    { date: new Date(year, 10, 11), name: "Armistice" },
    { date: new Date(year, 11, 25), name: "Noël" },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getFrenchPublicHolidaysInRange(rangeStart: Date, rangeEnd: Date): PublicHoliday[] {
  const holidays: PublicHoliday[] = [];
  for (let year = rangeStart.getFullYear(); year <= rangeEnd.getFullYear(); year++) {
    holidays.push(...getFrenchPublicHolidays(year));
  }
  return holidays.filter((h) => h.date >= rangeStart && h.date < rangeEnd);
}
