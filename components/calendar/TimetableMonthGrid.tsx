import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TimetableBlock, TimetableOverride } from "@/hooks/useTimetable";
import type { FamilyMember } from "@/hooks/useFamilyMembers";
import { expandTimetableWeek, type TimetableOccurrence } from "@/lib/timetable";
import { getMemberColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import { isToday, startOfWeek, toDateKey } from "@/lib/dateUtils";
import { weekdaysInitialMonFirst } from "@/lib/weekdayLabels";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

const MIN_VISIBLE_LANES = 2;

type Props = {
  monthAnchor: Date;
  blocks: TimetableBlock[];
  overrides: TimetableOverride[];
  members: FamilyMember[];
  memberFilter: string | null;
  onSelectDay: (day: Date) => void;
  onSelectOccurrence: (occ: TimetableOccurrence) => void;
};

export function TimetableMonthGrid({
  monthAnchor,
  blocks,
  overrides,
  members,
  memberFilter,
  onSelectDay,
  onSelectOccurrence,
}: Props) {
  const { t } = useTranslation();
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
  const weekCount = days.length / 7;

  // Timetable occurrences are always single-day (weekly recurrence, no
  // multi-day span), so — unlike the Calendar month grid — bars never need
  // to stretch across days; each day just gets its own small stack.
  const occurrencesByDate = new Map<string, TimetableOccurrence[]>();
  for (let w = 0; w < weekCount; w++) {
    const weekStart = new Date(gridStart);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekOccurrences = expandTimetableWeek(blocks, overrides, weekStart).filter(
      (occ) => !memberFilter || occ.appliesToWholeFamily || occ.profileId === memberFilter
    );
    for (const occ of weekOccurrences) {
      const key = toDateKey(occ.date);
      const list = occurrencesByDate.get(key) ?? [];
      list.push(occ);
      occurrencesByDate.set(key, list);
    }
  }

  return (
    <View>
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
        const dayOccLists = weekDays.map((d) => occurrencesByDate.get(toDateKey(d)) ?? []);
        const laneCount = Math.max(MIN_VISIBLE_LANES, ...dayOccLists.map((l) => l.length));

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
                const today = isToday(day);
                return (
                  <View key={i} style={styles.dayHeaderCell}>
                    <View style={[styles.dateCircle, today && styles.dateCircleToday]}>
                      <Text style={[styles.dateNumber, !inMonth && styles.dateNumberFaint]}>{day.getDate()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View pointerEvents="box-none" style={styles.laneStack}>
              {Array.from({ length: laneCount }, (_, lane) => (
                <View key={lane} pointerEvents="box-none" style={styles.laneRow}>
                  {weekDays.map((_, dayInWeek) => {
                    const occ = dayOccLists[dayInWeek][lane];
                    if (!occ) return null;
                    const member = occ.appliesToWholeFamily ? null : members.find((m) => m.id === occ.profileId);
                    const color = occ.appliesToWholeFamily ? NEUTRAL_COLOR : member ? getMemberColor(member) : NEUTRAL_COLOR;
                    const label =
                      occ.label || (occ.appliesToWholeFamily ? t("common.wholeFamily") : member?.full_name ?? t("common.member"));
                    return (
                      <TouchableOpacity
                        key={occ.key}
                        style={[
                          styles.bar,
                          { left: `${(dayInWeek / 7) * 100}%`, width: `${(1 / 7) * 100}%`, backgroundColor: color },
                        ]}
                        onPress={() => onSelectOccurrence(occ)}
                      >
                        <Text style={styles.barText} numberOfLines={1}>
                          {label}
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
  weekdayRow: { flexDirection: "row", paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.textFaint },
  weekRow: { paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  weekTapLayer: { flexDirection: "row" },
  dayTapColumn: { flex: 1 },
  weekNumbersRow: { flexDirection: "row" },
  dayHeaderCell: { flex: 1, alignItems: "center", gap: 2, paddingBottom: 2 },
  dateCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  dateCircleToday: { borderWidth: 1.5, borderColor: sectionColors.calendar },
  dateNumber: { fontSize: 12, fontWeight: "600", color: colors.text },
  dateNumberFaint: { color: colors.textFaint },
  laneStack: { gap: 2, paddingBottom: 3 },
  laneRow: { height: 15, position: "relative" },
  bar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRadius: radii.sm,
  },
  barText: { fontSize: 9, fontWeight: "700", color: colors.white },
});
