import { useMemo, useState } from "react";
import { ActivityIndicator, SectionList, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEvents, type CalendarEvent, type RecurrenceInput } from "@/hooks/useEvents";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useCalendarPrefs } from "@/hooks/useCalendarPrefs";
import { isThisWeek, startOfWeek } from "@/lib/dateUtils";
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
import { DayAgenda } from "@/components/calendar/DayAgenda";
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
  const { events, isLoading, addEvent, deleteEvent } = useEvents();
  const { members } = useFamilyMembers();
  const { prefs: calendarPrefs } = useCalendarPrefs();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [allDay, setAllDay] = useState(false);
  const [appliesToWholeFamily, setAppliesToWholeFamily] = useState(false);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceInput>(null);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [monthAnchor, setMonthAnchor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const filteredEvents = useMemo(
    () =>
      memberFilter
        ? events.filter((e) => e.applies_to_whole_family || e.participant_ids.includes(memberFilter))
        : events,
    [events, memberFilter]
  );

  const listRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 2);
    const end = new Date(now);
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

  const selectedDayOccurrences = useMemo(() => {
    const dayStart = startOfDay(selectedDay);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const source = viewMode === "month" ? monthOccurrences : weekOccurrences;
    return source.filter((occ) => occ.startAt >= dayStart && occ.startAt < dayEnd);
  }, [viewMode, monthOccurrences, weekOccurrences, selectedDay]);

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
  const selectedDayHoliday = useMemo(() => {
    const source = viewMode === "month" ? monthHolidays : weekHolidays;
    return source.find((h) => h.date.toDateString() === selectedDay.toDateString());
  }, [viewMode, monthHolidays, weekHolidays, selectedDay]);

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
        title: new Date(dateKey).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        isThisWeek: isThisWeek(new Date(dateKey)),
        data: occs,
      }));
  }, [listOccurrences]);

  function navigateWeek(dir: -1 | 1) {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + dir * 7);
    setWeekAnchor(next);
    setSelectedDay(next);
  }
  const weekSwipeHandlers = useSwipeNavigate(navigateWeek);

  function navigateMonth(dir: -1 | 1) {
    const next = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + dir, 1);
    setMonthAnchor(next);
    setSelectedDay(next);
  }
  const monthSwipeHandlers = useSwipeNavigate(navigateMonth);

  function goToToday() {
    const now = new Date();
    setWeekAnchor(now);
    setMonthAnchor(now);
    setSelectedDay(now);
  }

  function resetForm() {
    setTitle("");
    setDate(new Date());
    setAllDay(false);
    setAppliesToWholeFamily(false);
    setParticipantIds([]);
    setIsPrivate(false);
    setRecurrence(null);
    setReminderOffsets([]);
  }

  async function handleAddEvent() {
    if (!title.trim()) return;
    await addEvent({
      title: title.trim(),
      startAt: date,
      allDay,
      appliesToWholeFamily,
      participantIds,
      isPrivate,
      recurrence,
      reminderOffsetsMinutes: reminderOffsets,
    });
    resetForm();
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
        title="Calendar"
        icon="calendar"
        tint={sectionColors.calendar}
        tintBackground={sectionTints.calendar}
        actionLabel="+ Add Event"
        onAction={() => setIsAdding(true)}
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
                {mode === "list" ? "List" : mode === "week" ? "Week" : "Month"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {viewMode !== "list" && (
          <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.timetableButton} onPress={() => router.push("/timetable")}>
          <Ionicons name="time-outline" size={16} color={sectionColors.calendar} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <Chip
          label="Everyone"
          selected={memberFilter === null}
          onPress={() => setMemberFilter(null)}
          color={NEUTRAL_COLOR}
        />
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.full_name ?? "Member"}
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
              {section.isThisWeek && <Text style={styles.weekBadge}>This week</Text>}
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
          ListEmptyComponent={<Text style={styles.emptyText}>No events yet. Tap + Add Event to create one.</Text>}
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
          />
        </View>
      )}

      {viewMode === "month" && (
        <View style={styles.flex} {...monthSwipeHandlers}>
          <MonthGrid
            monthAnchor={monthAnchor}
            selectedDay={selectedDay}
            occurrences={monthOccurrences}
            members={members}
            holidays={monthHolidays}
            onSelectDay={setSelectedDay}
            onNavigate={navigateMonth}
          />
          <DayAgenda
            date={selectedDay}
            occurrences={selectedDayOccurrences}
            members={members}
            holiday={selectedDayHoliday}
            onDeleteEvent={deleteEvent}
          />
        </View>
      )}

      <BottomSheetModal visible={isAdding} onClose={() => setIsAdding(false)} contentStyle={styles.modalContentScrollable}>
        <ModalTitle icon="calendar" tint={sectionColors.calendar} tintBackground={sectionTints.calendar} title="New event" />
        <TextField placeholder="Event title" value={title} onChangeText={setTitle} autoFocus />

        <View style={styles.switchRow}>
          <FieldLabel icon="sunny-outline" label="All day" />
          <Switch value={allDay} onValueChange={setAllDay} trackColor={{ false: colors.border, true: sectionColors.calendar }} />
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={15} color={sectionColors.calendar} />
            <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {!allDay && (
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={15} color={sectionColors.calendar} />
              <Text style={styles.dateButtonText}>
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(_, selected) => {
              setShowDatePicker(false);
              if (selected) {
                const next = new Date(date);
                next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                setDate(next);
              }
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={(_, selected) => {
              setShowTimePicker(false);
              if (selected) {
                const next = new Date(date);
                next.setHours(selected.getHours(), selected.getMinutes());
                setDate(next);
              }
            }}
          />
        )}

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
          <FieldLabel icon="lock-closed-outline" label="Keep it private" />
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            trackColor={{ false: colors.border, true: sectionColors.calendar }}
          />
        </View>

        <Button label="Add event" onPress={handleAddEvent} style={styles.submitButton} />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
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
  dateRow: { flexDirection: "row", gap: spacing.sm },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dateButtonText: { fontSize: 15, fontWeight: "600", color: colors.text },
  submitButton: { marginTop: spacing.sm, backgroundColor: sectionColors.calendar },
});
