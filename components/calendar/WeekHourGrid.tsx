import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { PinchGestureHandler } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import type { Occurrence } from "@/lib/recurrence";
import type { CalendarEvent } from "@/hooks/useEvents";
import type { FamilyMember } from "@/hooks/useFamilyMembers";
import type { HolidayMarker } from "@/lib/holidayMarkers";
import { getEventDotColors } from "@/lib/memberColors";
import { formatDate, isToday } from "@/lib/dateUtils";
import { weekdaysShortMonFirst } from "@/lib/weekdayLabels";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

const DEFAULT_HOUR_HEIGHT = 56;
const MIN_HOUR_HEIGHT = 30;
const MAX_HOUR_HEIGHT = 110;
const GUTTER_WIDTH = 26;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type WeekMode = "full" | "work";

type Props = {
  weekStart: Date;
  occurrences: Occurrence<CalendarEvent>[];
  members: FamilyMember[];
  holidays: HolidayMarker[];
  onNavigate: (direction: -1 | 1) => void;
};

export function WeekHourGrid({ weekStart, occurrences, members, holidays, onNavigate }: Props) {
  const { t } = useTranslation();
  const dayInitials = weekdaysShortMonFirst();
  const scrollRef = useRef<ScrollView>(null);
  const [weekMode, setWeekMode] = useState<WeekMode>("full");
  const { value: hourHeight, onGestureEvent, onHandlerStateChange } = usePinchZoom(
    DEFAULT_HOUR_HEIGHT,
    MIN_HOUR_HEIGHT,
    MAX_HOUR_HEIGHT
  );

  // Keep whatever hour is currently at the top of the viewport pinned there
  // as hourHeight changes, instead of the grid visually "expanding" from
  // midnight while the scroll offset stays put.
  const scrollYRef = useRef(0);
  const prevHourHeightRef = useRef(DEFAULT_HOUR_HEIGHT);

  function handleScroll(event: { nativeEvent: { contentOffset: { y: number } } }) {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }

  useEffect(() => {
    const prev = prevHourHeightRef.current;
    if (prev !== hourHeight) {
      const anchorHour = scrollYRef.current / prev;
      const newY = anchorHour * hourHeight;
      scrollRef.current?.scrollTo({ y: newY, animated: false });
      scrollYRef.current = newY;
      prevHourHeightRef.current = hourHeight;
    }
  }, [hourHeight]);

  const dayCount = weekMode === "work" ? 5 : 7;
  const days = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const headerLabel = `${formatDate(weekStart, { month: "short", day: "numeric" })} – ${formatDate(weekEnd, { month: "short", day: "numeric" })}`;

  const allDayOccurrences = occurrences.filter((occ) => occ.event.all_day);
  const timedOccurrences = occurrences.filter((occ) => !occ.event.all_day);

  useEffect(() => {
    const now = new Date();
    const scrollToHour = Math.max(0, now.getHours() - 1);
    scrollRef.current?.scrollTo({ y: scrollToHour * hourHeight, animated: false });
  }, [weekStart]);

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => onNavigate(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navLabel}>{headerLabel}</Text>
        <TouchableOpacity onPress={() => onNavigate(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekModeRow}>
        <TouchableOpacity
          style={[styles.weekModeButton, weekMode === "full" && styles.weekModeButtonActive]}
          onPress={() => setWeekMode("full")}
        >
          <Text style={[styles.weekModeText, weekMode === "full" && styles.weekModeTextActive]}>{t("calendar.fullWeek")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.weekModeButton, weekMode === "work" && styles.weekModeButtonActive]}
          onPress={() => setWeekMode("work")}
        >
          <Text style={[styles.weekModeText, weekMode === "work" && styles.weekModeTextActive]}>{t("calendar.workWeek")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dayHeaderRow}>
        <View style={styles.gutter} />
        {days.map((day, i) => {
          const publicHoliday = holidays.find(
            (h) => h.type === "public" && h.date.toDateString() === day.toDateString()
          );
          const schoolHoliday = holidays.find(
            (h) => h.type === "school" && h.date.toDateString() === day.toDateString()
          );
          return (
            <View key={i} style={styles.dayHeaderCell}>
              <Text style={styles.dayHeaderInitial}>{dayInitials[i]}</Text>
              <View
                style={[
                  styles.dayHeaderCircle,
                  isToday(day) && styles.dayHeaderCircleToday,
                  publicHoliday && { borderWidth: 1.5, borderColor: publicHoliday.color },
                ]}
              >
                <Text style={[styles.dayHeaderNumber, isToday(day) && styles.dayHeaderNumberToday]}>
                  {day.getDate()}
                </Text>
              </View>
              {schoolHoliday && <View style={[styles.schoolHolidayBar, { backgroundColor: schoolHoliday.color }]} />}
            </View>
          );
        })}
      </View>

      {allDayOccurrences.length > 0 && (
        <View style={styles.allDayRow}>
          <View style={styles.gutter} />
          {days.map((day, i) => (
            <View key={i} style={styles.allDayCell}>
              {allDayOccurrences
                .filter((occ) => occ.startAt.toDateString() === day.toDateString())
                .map((occ) => (
                  <TouchableOpacity
                    key={occ.key}
                    style={[
                      styles.allDayPill,
                      { backgroundColor: getEventDotColors(occ.event, members)[0] ?? sectionColors.calendar },
                    ]}
                    onPress={() => router.push(`/event/${occ.event.id}`)}
                  >
                    <Text style={styles.allDayPillText} numberOfLines={1}>
                      {occ.event.title}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          ))}
        </View>
      )}

      <PinchGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        simultaneousHandlers={scrollRef}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.gridRow}>
            <View style={styles.gutter}>
              {HOURS.map((h) => (
                <View key={h} style={[styles.hourGutterCell, { height: hourHeight }]}>
                  <Text style={styles.hourLabel}>{h === 0 ? "" : `${h}h`}</Text>
                </View>
              ))}
            </View>
            {days.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayColumn}>
                {HOURS.map((h) => (
                  <View key={h} style={[styles.hourCell, { height: hourHeight }]} />
                ))}
                {timedOccurrences
                  .filter((occ) => occ.startAt.toDateString() === day.toDateString())
                  .map((occ) => {
                    const minutesFromMidnight = occ.startAt.getHours() * 60 + occ.startAt.getMinutes();
                    const top = (minutesFromMidnight / 60) * hourHeight;
                    const dotColor = getEventDotColors(occ.event, members)[0] ?? sectionColors.calendar;
                    return (
                      <TouchableOpacity
                        key={occ.key}
                        style={[styles.eventBlock, { top, height: hourHeight - 4, backgroundColor: dotColor }]}
                        onPress={() => router.push(`/event/${occ.event.id}`)}
                      >
                        <Text style={styles.eventBlockText} numberOfLines={2}>
                          {occ.event.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            ))}
          </View>
        </ScrollView>
      </PinchGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  weekModeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  weekModeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  weekModeButtonActive: { backgroundColor: sectionColors.calendar },
  weekModeText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  weekModeTextActive: { color: colors.white },
  gutter: { width: GUTTER_WIDTH },
  dayHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dayHeaderCell: { flex: 1, alignItems: "center", gap: 2 },
  dayHeaderInitial: { fontSize: 10, fontWeight: "700", color: colors.textFaint },
  dayHeaderCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayHeaderCircleToday: { backgroundColor: sectionColors.calendar },
  dayHeaderNumber: { fontSize: 12, fontWeight: "700", color: colors.text },
  dayHeaderNumberToday: { color: colors.white },
  schoolHolidayBar: { width: "100%", height: 4, marginTop: 2 },
  allDayRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  allDayCell: { flex: 1, gap: 2, paddingHorizontal: 2 },
  allDayPill: { borderRadius: radii.sm, paddingHorizontal: 4, paddingVertical: 2 },
  allDayPillText: { fontSize: 9, fontWeight: "700", color: colors.white },
  scroll: { flex: 1 },
  gridRow: { flexDirection: "row", paddingHorizontal: spacing.sm },
  hourGutterCell: { alignItems: "flex-end", paddingRight: 3 },
  hourLabel: { fontSize: 9, color: colors.textFaint, transform: [{ translateY: -6 }] },
  dayColumn: { flex: 1, position: "relative" },
  hourCell: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  eventBlock: {
    position: "absolute",
    left: 1,
    right: 1,
    borderRadius: radii.sm,
    padding: 2,
  },
  eventBlockText: { fontSize: 9, fontWeight: "700", color: colors.white },
});
