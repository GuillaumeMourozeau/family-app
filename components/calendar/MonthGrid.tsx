import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Occurrence } from "@/lib/recurrence";
import type { CalendarEvent } from "@/hooks/useEvents";
import type { FamilyMember } from "@/hooks/useFamilyMembers";
import type { HolidayMarker } from "@/lib/holidayMarkers";
import { getEventDotColors } from "@/lib/memberColors";
import { formatDate, isToday, startOfWeek } from "@/lib/dateUtils";
import { weekdaysInitialMonFirst } from "@/lib/weekdayLabels";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

type Props = {
  monthAnchor: Date;
  selectedDay: Date;
  occurrences: Occurrence<CalendarEvent>[];
  members: FamilyMember[];
  holidays: HolidayMarker[];
  onSelectDay: (day: Date) => void;
  onNavigate: (direction: -1 | 1) => void;
};

export function MonthGrid({ monthAnchor, selectedDay, occurrences, members, holidays, onSelectDay, onNavigate }: Props) {
  const { i18n } = useTranslation();
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

  const headerLabel = formatDate(monthAnchor, { month: "long", year: "numeric" });

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
      <View style={styles.grid}>
        {days.map((day, i) => {
          const inMonth = day.getMonth() === monthAnchor.getMonth();
          const selected = day.toDateString() === selectedDay.toDateString();
          const today = isToday(day);
          const dayColors = Array.from(
            new Set(
              occurrences
                .filter((occ) => occ.startAt.toDateString() === day.toDateString())
                .flatMap((occ) => getEventDotColors(occ.event, members))
            )
          ).slice(0, 3);
          const publicHoliday = holidays.find(
            (h) => h.type === "public" && h.date.toDateString() === day.toDateString()
          );
          const schoolHoliday = holidays.find(
            (h) => h.type === "school" && h.date.toDateString() === day.toDateString()
          );
          return (
            <TouchableOpacity key={i} style={styles.dayCell} onPress={() => onSelectDay(day)}>
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
              <View style={styles.dotRow}>
                {dayColors.map((c, ci) => (
                  <View key={ci} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
              {schoolHoliday && <View style={[styles.schoolHolidayBar, { backgroundColor: schoolHoliday.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
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
  weekdayRow: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.textFaint },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  dayCell: { width: `${100 / 7}%`, alignItems: "center", gap: 3, paddingVertical: 4 },
  dateCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dateCircleSelected: { backgroundColor: sectionColors.calendar },
  dateCircleToday: { borderWidth: 1.5, borderColor: sectionColors.calendar },
  dateNumber: { fontSize: 13, fontWeight: "600", color: colors.text },
  dateNumberFaint: { color: colors.textFaint },
  dateNumberSelected: { color: colors.white },
  dotRow: { flexDirection: "row", gap: 2, height: 6 },
  dot: { width: 5, height: 5, borderRadius: radii.pill },
  schoolHolidayBar: { width: "100%", height: 4, marginTop: 2 },
});
