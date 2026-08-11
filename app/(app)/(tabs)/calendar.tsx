import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, SectionList, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useEvents, type CalendarEvent, type RecurrenceInput } from "@/hooks/useEvents";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useCalendarPrefs } from "@/hooks/useCalendarPrefs";
import { formatDate, isThisWeek, startOfWeek } from "@/lib/dateUtils";
import { expandOccurrences } from "@/lib/recurrence";
import { getHolidayMarkers } from "@/lib/holidayMarkers";
import { getMemberColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import { useSwipeNavigate } from "@/hooks/useSwipeNavigate";
import { TabScreenHeader } from "@/components/TabScreenHeader";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { RecurrencePicker } from "@/components/RecurrencePicker";
import { EventReminderPicker } from "@/components/EventReminderPicker";
import { ForWhoPicker } from "@/components/calendar/ForWhoPicker";
import { EventRow } from "@/components/calendar/EventRow";
import { EventDateRangePicker } from "@/components/calendar/EventDateRangePicker";
import { WeekHourGrid } from "@/components/calendar/WeekHourGrid";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { colors, radii, sectionColors, sectionTints, spacing } from "@/lib/theme";

type ViewMode = "list" | "week" | "month";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const { events, isLoading, addEvent, deleteEvent } = useEvents();
  const { members } = useFamilyMembers();
  const { prefs: calendarPrefs } = useCalendarPrefs();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState(new Date());
  const [endAt, setEndAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [allDay, setAllDay] = useState(false);
  const [appliesToWholeFamily, setAppliesToWholeFamily] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceInput>(null);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);

  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [monthAnchor, setMonthAnchor] = useState(new Date());

  const filteredEvents = useMemo(
    () =>
      memberFilter
        ? events.filter((e) => e.applies_to_whole_family || e.participant_ids.includes(memberFilter))
        : events,
    [events, memberFilter]
  );

  const listRange = useMemo(() => {
    const start = startOfDay(new Date());
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 2);
    return { start, end };
  }, []);
  const listOccurrences = useMemo(
    () => expandOccurrences(filteredEvents, listRange.start, listRange.end),
    [filteredEvents, listRange]
  );

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);
  const weekOccurrences = useMemo(
    () => expandOccurrences(filteredEvents, weekStart, weekEnd),
    [filteredEvents, weekStart, weekEnd]
  );

  const monthGridRange = useMemo(() => {
    const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
    const start = startOfWeek(monthStart);
    const end = startOfWeek(monthEnd);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }, [monthAnchor]);
  const monthOccurrences = useMemo(
    () => expandOccurrences(filteredEvents, monthGridRange.start, monthGridRange.end),
    [filteredEvents, monthGridRange]
  );

  const holidayOptions = useMemo(
    () => ({
      showPublicHolidays: calendarPrefs.show_public_holidays,
      showSchoolHolidays: calendarPrefs.show_school_holidays,
      schoolZone: calendarPrefs.school_zone,
      holidayColor: calendarPrefs.holiday_color,
    }),
    [calendarPrefs]
  );
  const weekHolidays = useMemo(
    () => getHolidayMarkers(weekStart, weekEnd, holidayOptions),
    [weekStart, weekEnd, holidayOptions]
  );
  const monthHolidays = useMemo(
    () => getHolidayMarkers(monthGridRange.start, monthGridRange.end, holidayOptions),
    [monthGridRange, holidayOptions]
  );

  const sections = useMemo(() => {
    const byDate = new Map<string, typeof listOccurrences>();
    for (const occ of listOccurrences) {
      const key = occ.startAt.toDateString();
      const list = byDate.get(key) ?? [];
      list.push(occ);
      byDate.set(key, list);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([dateKey, occs]) => ({
        title: formatDate(new Date(dateKey), {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        isThisWeek: isThisWeek(new Date(dateKey)),
        data: occs,
      }));
  }, [listOccurrences, i18n.language]);

  function navigateWeek(dir: -1 | 1) {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + dir * 7);
    setWeekAnchor(next);
  }
  const weekSwipeHandlers = useSwipeNavigate(navigateWeek);

  function navigateMonth(dir: -1 | 1) {
    const next = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + dir, 1);
    setMonthAnchor(next);
  }
  const monthSwipeHandlers = useSwipeNavigate(navigateMonth);

  function goToToday() {
    const now = new Date();
    setWeekAnchor(now);
    setMonthAnchor(now);
  }

  function resetFormFields() {
    setTitle("");
    setAppliesToWholeFamily(false);
    setParticipantIds([]);
    setIsPrivate(false);
    setRecurrence(null);
    setReminderOffsets([]);
  }

  function openAddEvent() {
    resetFormFields();
    const now = new Date();
    setStartAt(now);
    setEndAt(new Date(now.getTime() + 60 * 60 * 1000));
    setAllDay(false);
    setIsAdding(true);
  }

  // Tapping a day in month view: default to an all-day event on that day.
  function openAddEventForDay(day: Date) {
    resetFormFields();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    setStartAt(start);
    setEndAt(start);
    setAllDay(true);
    setIsAdding(true);
  }

  // Tapping an empty slot in week view: default to a 1-hour timed event there.
  function openAddEventForSlot(slotStart: Date) {
    resetFormFields();
    setStartAt(slotStart);
    setEndAt(new Date(slotStart.getTime() + 60 * 60 * 1000));
    setAllDay(false);
    setIsAdding(true);
  }

  async function handleAddEvent() {
    if (!title.trim()) return;
    await addEvent({
      title: title.trim(),
      startAt,
      endAt,
      allDay,
      appliesToWholeFamily,
      participantIds,
      isPrivate,
      recurrence,
      reminderOffsetsMinutes: reminderOffsets,
    });
    setIsAdding(false);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TabScreenHeader
        title={t("calendar.tabTitle")}
        icon="calendar"
        tint={sectionColors.calendar}
        tintBackground={sectionTints.calendar}
        actionLabel={t("calendar.addEventAction")}
        onAction={openAddEvent}
        onIconPress={() => router.push("/calendar-settings")}
      />

      <View style={styles.viewSwitcherRow}>
        <View style={styles.viewSwitcher}>
          {(["list", "week", "month"] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewSwitcherButton, viewMode === mode && styles.viewSwitcherButtonActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewSwitcherText, viewMode === mode && styles.viewSwitcherTextActive]}>
                {mode === "list" ? t("calendar.viewList") : mode === "week" ? t("calendar.viewWeek") : t("calendar.viewMonth")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {viewMode !== "list" && (
          <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
            <Text style={styles.todayButtonText}>{t("calendar.today")}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.timetableButton} onPress={() => router.push("/timetable")}>
          <Ionicons name="time-outline" size={16} color={sectionColors.calendar} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <Chip
          label={t("common.everyone")}
          selected={memberFilter === null}
          onPress={() => setMemberFilter(null)}
          color={NEUTRAL_COLOR}
        />
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.full_name ?? t("common.member")}
            selected={memberFilter === m.id}
            onPress={() => setMemberFilter(m.id)}
            color={getMemberColor(m)}
          />
        ))}
      </View>

      {viewMode === "list" && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              {section.isThisWeek && <Text style={styles.weekBadge}>{t("calendar.thisWeek")}</Text>}
            </View>
          )}
          renderItem={({ item }) => (
            <EventRow
              event={item.event}
              startAt={item.startAt}
              members={members}
              onDelete={() => deleteEvent(item.event.id)}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{t("calendar.noEventsYet")}</Text>}
        />
      )}

      {viewMode === "week" && (
        <View style={styles.flex} {...weekSwipeHandlers}>
          <WeekHourGrid
            weekStart={weekStart}
            occurrences={weekOccurrences}
            members={members}
            holidays={weekHolidays}
            onNavigate={navigateWeek}
            onSlotPress={openAddEventForSlot}
          />
        </View>
      )}

      {viewMode === "month" && (
        <View style={styles.flex} {...monthSwipeHandlers}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.monthContent}>
            <MonthGrid
              monthAnchor={monthAnchor}
              occurrences={monthOccurrences}
              members={members}
              holidays={monthHolidays}
              onSelectDay={openAddEventForDay}
              onNavigate={navigateMonth}
            />
          </ScrollView>
        </View>
      )}

      <BottomSheetModal
        visible={isAdding}
        onClose={() => setIsAdding(false)}
        contentStyle={styles.modalContentScrollable}
        footer={<Button label={t("calendar.addEvent")} onPress={handleAddEvent} style={styles.submitButton} />}
      >
        <ModalTitle icon="calendar" tint={sectionColors.calendar} tintBackground={sectionTints.calendar} title={t("calendar.newEvent")} />
        <TextField placeholder={t("calendar.eventTitlePlaceholder")} value={title} onChangeText={setTitle} autoFocus />

        <EventDateRangePicker
          allDay={allDay}
          onAllDayChange={setAllDay}
          startAt={startAt}
          endAt={endAt}
          onStartAtChange={setStartAt}
          onEndAtChange={setEndAt}
          tint={sectionColors.calendar}
        />

        <RecurrencePicker value={recurrence} onChange={setRecurrence} tint={sectionColors.calendar} />

        <ForWhoPicker
          members={members}
          appliesToWholeFamily={appliesToWholeFamily}
          participantIds={participantIds}
          onChange={(next) => {
            setAppliesToWholeFamily(next.appliesToWholeFamily);
            setParticipantIds(next.participantIds);
          }}
        />

        <EventReminderPicker value={reminderOffsets} onChange={setReminderOffsets} tint={sectionColors.calendar} />

        <View style={styles.switchRow}>
          <FieldLabel icon="lock-closed-outline" label={t("common.keepItPrivate")} />
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: colors.border, true: sectionColors.calendar }}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  monthContent: { paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 40 },
  viewSwitcherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  viewSwitcher: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: 3,
  },
  viewSwitcherButton: {
    flex: 1,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  viewSwitcherButtonActive: { backgroundColor: colors.white },
  viewSwitcherText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  viewSwitcherTextActive: { color: sectionColors.calendar },
  todayButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: sectionColors.calendar,
  },
  todayButtonText: { fontSize: 13, fontWeight: "700", color: sectionColors.calendar },
  timetableButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: sectionColors.calendar,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs + 2,
    backgroundColor: colors.background,
  },
  sectionHeaderText: { fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase" },
  weekBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: sectionColors.calendar,
    backgroundColor: sectionTints.calendar,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.md,
  },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  modalContentScrollable: { maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  submitButton: { marginTop: spacing.sm, backgroundColor: sectionColors.calendar },
});
