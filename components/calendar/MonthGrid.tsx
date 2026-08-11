import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import type { Occurrence } from "@/lib/recurrence";
import type { CalendarEvent } from "@/hooks/useEvents";
import type { FamilyMember } from "@/hooks/useFamilyMembers";
import type { HolidayMarker } from "@/lib/holidayMarkers";
import { getEventDotColors } from "@/lib/memberColors";
import { formatDate, isToday, startOfWeek } from "@/lib/dateUtils";
import { weekdaysInitialMonFirst } from "@/lib/weekdayLabels";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

const DAY_MS = 24 * 60 * 60 * 1000;

type Props = {
  monthAnchor: Date;
  selectedDay: Date;
  occurrences: Occurrence<CalendarEvent>[];
  members: FamilyMember[];
  holidays: HolidayMarker[];
  onSelectDay: (day: Date) => void;
  onNavigate: (direction: -1 | 1) => void;
};

type Bar = {
  key: string;
  eventId: string;
  title: string;
  color: string;
  lane: number;
  startIndex: number;
  endIndex: number;
};

function dateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayIndex(date: Date, gridStart: Date): number {
  return Math.round((dateOnly(date).getTime() - gridStart.getTime()) / DAY_MS);
}

// Greedy interval-graph coloring: assigns each bar the lowest lane number
// that isn't already occupied by another bar overlapping its day range, so
// a multi-week event keeps the same lane (row) as it crosses week rows.
function assignLanes(bars: Omit<Bar, "lane">[]): Bar[] {
  const sorted = [...bars].sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    return b.endIndex - b.startIndex - (a.endIndex - a.startIndex);
  });
  const laneEnd: number[] = [];
  const result: Bar[] = [];
  for (const bar of sorted) {
    let lane = laneEnd.findIndex((end) => end < bar.startIndex);
    if (lane === -1) {
      lane = laneEnd.length;
      laneEnd.push(bar.endIndex);
    } else {
      laneEnd[lane] = bar.endIndex;
    }
    result.push({ ...bar, lane });
  }
  return result;
}

export function MonthGrid({ monthAnchor, selectedDay, occurrences, members, holidays, onSelectDay, onNavigate }: Props) {
  // Destructuring from useTranslation (even unused directly) subscribes this
  // component to i18n language changes, which weekdaysInitialMonFirst/formatDate
  // read from the i18n singleton outside React's render cycle.
  useTranslation();
  const dayInitials = weekdaysInitialMonFirst();
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = startOfWeek(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + 7);

  const days: Date[] = [];
  for (let cursor = new Date(gridStart); cursor < gridEnd; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }

  const bars = assignLanes(
    occurrences.map((occ) => ({
      key: occ.key,
      eventId: occ.event.id,
      title: occ.event.title,
      color: getEventDotColors(occ.event, members)[0] ?? sectionColors.calendar,
      startIndex: Math.max(0, dayIndex(occ.startAt, gridStart)),
      endIndex: Math.min(days.length - 1, dayIndex(occ.endAt, gridStart)),
    }))
  );

  const headerLabel = formatDate(monthAnchor, { month: "long", year: "numeric" });
  const weekCount = days.length / 7;

  return (
    <View>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => onNavigate(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navLabel}>{headerLabel}</Text>
        <TouchableOpacity onPress={() => onNavigate(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekdayRow}>
        {dayInitials.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {Array.from({ length: weekCount }, (_, weekIndex) => {
        const weekStartIndex = weekIndex * 7;
        const weekDays = days.slice(weekStartIndex, weekStartIndex + 7);
        const weekBars = bars.filter((b) => b.startIndex <= weekStartIndex + 6 && b.endIndex >= weekStartIndex);
        const laneCount = weekBars.reduce((max, b) => Math.max(max, b.lane + 1), 0);

        return (
          <View key={weekIndex} style={styles.weekRow}>
            <View style={[StyleSheet.absoluteFill, styles.weekTapLayer]} pointerEvents="box-none">
              {weekDays.map((day, i) => (
                <TouchableOpacity key={i} style={styles.dayTapColumn} onPress={() => onSelectDay(day)} />
              ))}
            </View>

            <View pointerEvents="none" style={styles.weekNumbersRow}>
              {weekDays.map((day, i) => {
                const inMonth = day.getMonth() === monthAnchor.getMonth();
                const selected = day.toDateString() === selectedDay.toDateString();
                const today = isToday(day);
                const publicHoliday = holidays.find(
                  (h) => h.type === "public" && h.date.toDateString() === day.toDateString()
                );
                const schoolHoliday = holidays.find(
                  (h) => h.type === "school" && h.date.toDateString() === day.toDateString()
                );
                return (
                  <View key={i} style={styles.dayHeaderCell}>
                    <View
                      style={[
                        styles.dateCircle,
                        selected && styles.dateCircleSelected,
                        today && !selected && styles.dateCircleToday,
                        publicHoliday && !selected && { borderWidth: 1.5, borderColor: publicHoliday.color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateNumber,
                          !inMonth && styles.dateNumberFaint,
                          selected && styles.dateNumberSelected,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                    {schoolHoliday && <View style={[styles.schoolHolidayBar, { backgroundColor: schoolHoliday.color }]} />}
                  </View>
                );
              })}
            </View>

            <View pointerEvents="box-none" style={styles.laneStack}>
              {Array.from({ length: laneCount }, (_, lane) => (
                <View key={lane} pointerEvents="box-none" style={styles.laneRow}>
                  {weekBars
                    .filter((b) => b.lane === lane)
                    .map((bar) => {
                      const clippedStart = Math.max(bar.startIndex, weekStartIndex) - weekStartIndex;
                      const clippedEnd = Math.min(bar.endIndex, weekStartIndex + 6) - weekStartIndex;
                      const left = (clippedStart / 7) * 100;
                      const width = ((clippedEnd - clippedStart + 1) / 7) * 100;
                      const roundLeft = bar.startIndex >= weekStartIndex;
                      const roundRight = bar.endIndex <= weekStartIndex + 6;
                      return (
                        <TouchableOpacity
                          key={bar.key}
                          style={[
                            styles.bar,
                            {
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: bar.color,
                              borderTopLeftRadius: roundLeft ? radii.sm : 0,
                              borderBottomLeftRadius: roundLeft ? radii.sm : 0,
                              borderTopRightRadius: roundRight ? radii.sm : 0,
                              borderBottomRightRadius: roundRight ? radii.sm : 0,
                            },
                          ]}
                          onPress={() => router.push(`/event/${bar.eventId}`)}
                        >
                          <Text style={styles.barText} numberOfLines={1}>
                            {bar.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  navButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  navButtonText: { fontSize: 20, fontWeight: "700", color: sectionColors.calendar },
  navLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  weekdayRow: { flexDirection: "row", paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.textFaint },
  weekRow: { paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  weekTapLayer: { flexDirection: "row" },
  dayTapColumn: { flex: 1 },
  weekNumbersRow: { flexDirection: "row" },
  dayHeaderCell: { flex: 1, alignItems: "center", gap: 2, paddingBottom: 2 },
  dateCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  dateCircleSelected: { backgroundColor: sectionColors.calendar },
  dateCircleToday: { borderWidth: 1.5, borderColor: sectionColors.calendar },
  dateNumber: { fontSize: 12, fontWeight: "600", color: colors.text },
  dateNumberFaint: { color: colors.textFaint },
  dateNumberSelected: { color: colors.white },
  schoolHolidayBar: { width: "70%", height: 3, borderRadius: radii.pill },
  laneStack: { gap: 2, paddingBottom: 3 },
  laneRow: { height: 15, position: "relative" },
  bar: { position: "absolute", top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 4 },
  barText: { fontSize: 9, fontWeight: "700", color: colors.white },
});
