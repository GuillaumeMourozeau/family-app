import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PanGestureHandler, PinchGestureHandler, State, type PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { useTimetable } from "@/hooks/useTimetable";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { usePinchZoom } from "@/hooks/usePinchZoom";
import { formatDate, startOfWeek } from "@/lib/dateUtils";
import { weekdaysShortMonFirst } from "@/lib/weekdayLabels";
import {
  expandTimetableWeek,
  timeStringToDate,
  dateToTimeString,
  formatTimeLabel,
  minutesFromMidnight,
  type TimetableOccurrence,
} from "@/lib/timetable";
import { getMemberColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, radii, sectionColors, sectionTints, spacing } from "@/lib/theme";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GUTTER_WIDTH = 26;
const DEFAULT_HOUR_HEIGHT = 52;
const MIN_HOUR_HEIGHT = 28;
const MAX_HOUR_HEIGHT = 110;
const DEFAULT_START_HOUR = 8;
const SWIPE_DISTANCE_THRESHOLD = 60;

type WeekMode = "full" | "work";

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function TimetableScreen() {
  const { t } = useTranslation();
  const DAY_LABELS = weekdaysShortMonFirst();
  const { blocks, overrides, addBlock, updateBlock, deleteBlock, setOverride, clearOverride } = useTimetable();
  const { members } = useFamilyMembers();
  const scrollRef = useRef<ScrollView>(null);
  const pinchRef = useRef(null);
  const panRef = useRef(null);

  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
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

  const [isAdding, setIsAdding] = useState(false);
  const [newMemberId, setNewMemberId] = useState<string | null>(null);
  const [newAppliesToWholeFamily, setNewAppliesToWholeFamily] = useState(false);
  const [newDaysOfWeek, setNewDaysOfWeek] = useState<number[]>([0]);
  const [newStart, setNewStart] = useState(() => timeStringToDate("09:00"));
  const [newEnd, setNewEnd] = useState(() => timeStringToDate("17:00"));
  const [newLabel, setNewLabel] = useState("");
  const [showNewStartPicker, setShowNewStartPicker] = useState(false);
  const [showNewEndPicker, setShowNewEndPicker] = useState(false);

  const [editingOccurrence, setEditingOccurrence] = useState<TimetableOccurrence | null>(null);
  const [editScope, setEditScope] = useState<"day" | "series">("day");
  const [editStart, setEditStart] = useState(() => new Date());
  const [editEnd, setEditEnd] = useState(() => new Date());
  const [editLabel, setEditLabel] = useState("");
  const [editDaysOfWeek, setEditDaysOfWeek] = useState<number[]>([]);
  const [showEditStartPicker, setShowEditStartPicker] = useState(false);
  const [showEditEndPicker, setShowEditEndPicker] = useState(false);

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const dayCount = weekMode === "work" ? 5 : 7;
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart, dayCount]
  );

  const occurrences = useMemo(() => expandTimetableWeek(blocks, overrides, weekStart), [blocks, overrides, weekStart]);
  const filteredOccurrences = useMemo(
    () =>
      memberFilter ? occurrences.filter((o) => o.appliesToWholeFamily || o.profileId === memberFilter) : occurrences,
    [occurrences, memberFilter]
  );

  const occurrencesByDay = useMemo(() => {
    const map = new Map<number, TimetableOccurrence[]>();
    for (const occ of filteredOccurrences) {
      const dayIndex = Math.floor((occ.date.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
      const list = map.get(dayIndex) ?? [];
      list.push(occ);
      map.set(dayIndex, list);
    }
    return map;
  }, [filteredOccurrences, weekStart]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: DEFAULT_START_HOUR * hourHeight, animated: false });
  }, [weekStart]);

  function navigateWeek(dir: -1 | 1) {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + dir * 7);
    setWeekAnchor(next);
  }

  function goToToday() {
    setWeekAnchor(new Date());
  }

  function handleSwipeStateChange(event: PanGestureHandlerStateChangeEvent) {
    const { state, translationX, translationY } = event.nativeEvent;
    if (state !== State.END) return;
    if (Math.abs(translationX) < SWIPE_DISTANCE_THRESHOLD || Math.abs(translationX) < Math.abs(translationY)) return;
    navigateWeek(translationX < 0 ? 1 : -1);
  }

  function openAddBlock() {
    setNewMemberId(members[0]?.id ?? null);
    setNewAppliesToWholeFamily(false);
    setNewDaysOfWeek([0]);
    setNewStart(timeStringToDate("09:00"));
    setNewEnd(timeStringToDate("17:00"));
    setNewLabel("");
    setIsAdding(true);
  }

  function toggleNewDay(day: number) {
    setNewDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function handleSaveNewBlock() {
    if ((!newAppliesToWholeFamily && !newMemberId) || newDaysOfWeek.length === 0) return;
    await addBlock({
      profileId: newMemberId,
      appliesToWholeFamily: newAppliesToWholeFamily,
      daysOfWeek: newDaysOfWeek,
      startTime: dateToTimeString(newStart),
      endTime: dateToTimeString(newEnd),
      label: newLabel.trim(),
    });
    setIsAdding(false);
  }

  function openEditOccurrence(occ: TimetableOccurrence) {
    setEditingOccurrence(occ);
    setEditScope("day");
    setEditStart(timeStringToDate(occ.startTime));
    setEditEnd(timeStringToDate(occ.endTime));
    setEditLabel(occ.label);
    const block = blocks.find((b) => b.id === occ.blockId);
    setEditDaysOfWeek(block?.days_of_week ?? []);
  }

  function toggleEditDay(day: number) {
    setEditDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function dateKeyOf(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  async function handleSaveEdit() {
    if (!editingOccurrence) return;
    const startTime = dateToTimeString(editStart);
    const endTime = dateToTimeString(editEnd);
    if (editScope === "day") {
      await setOverride(editingOccurrence.blockId, dateKeyOf(editingOccurrence.date), {
        startTime,
        endTime,
        label: editLabel.trim(),
      });
    } else {
      if (editDaysOfWeek.length === 0) return;
      await updateBlock(editingOccurrence.blockId, {
        startTime,
        endTime,
        label: editLabel.trim(),
        daysOfWeek: editDaysOfWeek,
      });
    }
    setEditingOccurrence(null);
  }

  function handleDeleteEdit() {
    if (!editingOccurrence) return;
    const occ = editingOccurrence;
    if (editScope === "day") {
      Alert.alert(t("timetable.removeDayTitle"), t("timetable.removeDayMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: async () => {
            await setOverride(occ.blockId, dateKeyOf(occ.date), { isCancelled: true });
            setEditingOccurrence(null);
          },
        },
      ]);
    } else {
      Alert.alert(t("timetable.deleteScheduleTitle"), t("timetable.deleteScheduleMessage"), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deleteBlock(occ.blockId);
            setEditingOccurrence(null);
          },
        },
      ]);
    }
  }

  async function handleRevertOverride() {
    if (!editingOccurrence) return;
    await clearOverride(editingOccurrence.blockId, dateKeyOf(editingOccurrence.date));
    setEditingOccurrence(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("timetable.title")}</Text>
        <TouchableOpacity onPress={openAddBlock}>
          <Ionicons name="add-circle" size={26} color={sectionColors.calendar} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <Chip label={t("common.everyone")} selected={memberFilter === null} onPress={() => setMemberFilter(null)} color={NEUTRAL_COLOR} />
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

      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navLabel}>
            {t("timetable.weekOf", { date: formatDate(weekStart, { month: "short", day: "numeric" }) })}
          </Text>
          <TouchableOpacity style={styles.todayButton} onPress={goToToday}>
            <Text style={styles.todayButtonText}>{t("calendar.today")}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navButton}>
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
        <View style={{ width: GUTTER_WIDTH }} />
        {days.map((day, i) => (
          <View key={i} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderInitial}>{DAY_LABELS[i]}</Text>
            <Text style={[styles.dayHeaderNumber, isSameDay(day, new Date()) && styles.dayHeaderNumberToday]}>
              {day.getDate()}
            </Text>
          </View>
        ))}
      </View>

      <PanGestureHandler
        ref={panRef}
        onHandlerStateChange={handleSwipeStateChange}
        activeOffsetX={[-20, 20]}
        failOffsetY={[-15, 15]}
        simultaneousHandlers={[pinchRef, scrollRef]}
      >
      <PinchGestureHandler
        ref={pinchRef}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        simultaneousHandlers={[scrollRef, panRef]}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.gridRow}>
            <View style={{ width: GUTTER_WIDTH }}>
              {HOURS.map((h) => (
                <View key={h} style={{ height: hourHeight, alignItems: "flex-end", paddingRight: 3 }}>
                  <Text style={styles.hourLabel}>{h === 0 ? "" : `${h}h`}</Text>
                </View>
              ))}
            </View>
            {days.map((_, dayIndex) => {
              const dayOccurrences = occurrencesByDay.get(dayIndex) ?? [];
              return (
                <View key={dayIndex} style={styles.dayColumn}>
                  {HOURS.map((h) => (
                    <View key={h} style={[styles.hourCell, { height: hourHeight }]} />
                  ))}
                  {dayOccurrences.map((occ, i) => {
                    const top = (minutesFromMidnight(occ.startTime) / 60) * hourHeight;
                    const height = Math.max(
                      18,
                      ((minutesFromMidnight(occ.endTime) - minutesFromMidnight(occ.startTime)) / 60) * hourHeight
                    );
                    const width = 100 / dayOccurrences.length;
                    const member = occ.appliesToWholeFamily ? null : members.find((m) => m.id === occ.profileId);
                    const color = occ.appliesToWholeFamily ? NEUTRAL_COLOR : member ? getMemberColor(member) : NEUTRAL_COLOR;
                    return (
                      <TouchableOpacity
                        key={occ.key}
                        style={[
                          styles.block,
                          {
                            top,
                            height,
                            left: `${width * i}%`,
                            width: `${width}%`,
                            backgroundColor: color,
                          },
                        ]}
                        onPress={() => openEditOccurrence(occ)}
                      >
                        <Text style={styles.blockText} numberOfLines={1}>
                          {occ.appliesToWholeFamily ? t("common.wholeFamily") : member?.full_name ?? t("common.member")}
                        </Text>
                        {occ.label ? (
                          <Text style={styles.blockSubtext} numberOfLines={1}>
                            {occ.label}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </PinchGestureHandler>
      </PanGestureHandler>

      <BottomSheetModal visible={isAdding} onClose={() => setIsAdding(false)}>
        <ModalTitle icon="time" tint={sectionColors.calendar} tintBackground={sectionTints.calendar} title={t("timetable.newBlock")} />

        <FieldLabel icon="person-outline" label={t("timetable.member")} />
        <View style={styles.chipRow}>
          <Chip
            label={t("common.wholeFamily")}
            selected={newAppliesToWholeFamily}
            onPress={() => setNewAppliesToWholeFamily(true)}
            color={NEUTRAL_COLOR}
          />
          {members.map((m) => (
            <Chip
              key={m.id}
              label={m.full_name ?? t("common.member")}
              selected={!newAppliesToWholeFamily && newMemberId === m.id}
              onPress={() => {
                setNewAppliesToWholeFamily(false);
                setNewMemberId(m.id);
              }}
              color={getMemberColor(m)}
            />
          ))}
        </View>

        <FieldLabel icon="calendar-outline" label={t("timetable.day")} />
        <View style={styles.chipRow}>
          {DAY_LABELS.map((label, i) => (
            <Chip
              key={label}
              label={label}
              selected={newDaysOfWeek.includes(i)}
              onPress={() => toggleNewDay(i)}
              color={sectionColors.calendar}
            />
          ))}
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowNewStartPicker(true)}>
            <Ionicons name="time-outline" size={15} color={sectionColors.calendar} />
            <Text style={styles.dateButtonText}>{formatTimeLabel(dateToTimeString(newStart))}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowNewEndPicker(true)}>
            <Ionicons name="time-outline" size={15} color={sectionColors.calendar} />
            <Text style={styles.dateButtonText}>{formatTimeLabel(dateToTimeString(newEnd))}</Text>
          </TouchableOpacity>
        </View>
        {showNewStartPicker && (
          <DateTimePicker
            value={newStart}
            mode="time"
            display="default"
            onChange={(_, selected) => {
              setShowNewStartPicker(false);
              if (selected) setNewStart(selected);
            }}
          />
        )}
        {showNewEndPicker && (
          <DateTimePicker
            value={newEnd}
            mode="time"
            display="default"
            onChange={(_, selected) => {
              setShowNewEndPicker(false);
              if (selected) setNewEnd(selected);
            }}
          />
        )}

        <FieldLabel icon="pricetag-outline" label={t("timetable.labelOptional")} />
        <TextField placeholder={t("timetable.labelPlaceholder")} value={newLabel} onChangeText={setNewLabel} />

        <Button label={t("common.add")} onPress={handleSaveNewBlock} style={[styles.submitButton, { backgroundColor: sectionColors.calendar }]} />
      </BottomSheetModal>

      <BottomSheetModal visible={!!editingOccurrence} onClose={() => setEditingOccurrence(null)}>
        <ModalTitle icon="create-outline" tint={sectionColors.calendar} tintBackground={sectionTints.calendar} title={t("timetable.editBlock")} />

        <FieldLabel icon="git-branch-outline" label={t("timetable.appliesTo")} />
        <View style={styles.chipRow}>
          <Chip label={t("timetable.thisDayOnly")} selected={editScope === "day"} onPress={() => setEditScope("day")} color={sectionColors.calendar} />
          <Chip label={t("timetable.everyWeek")} selected={editScope === "series"} onPress={() => setEditScope("series")} color={sectionColors.calendar} />
        </View>

        {editScope === "series" && (
          <>
            <FieldLabel icon="calendar-outline" label={t("timetable.day")} />
            <View style={styles.chipRow}>
              {DAY_LABELS.map((label, i) => (
                <Chip
                  key={label}
                  label={label}
                  selected={editDaysOfWeek.includes(i)}
                  onPress={() => toggleEditDay(i)}
                  color={sectionColors.calendar}
                />
              ))}
            </View>
          </>
        )}

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEditStartPicker(true)}>
            <Ionicons name="time-outline" size={15} color={sectionColors.calendar} />
            <Text style={styles.dateButtonText}>{formatTimeLabel(dateToTimeString(editStart))}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEditEndPicker(true)}>
            <Ionicons name="time-outline" size={15} color={sectionColors.calendar} />
            <Text style={styles.dateButtonText}>{formatTimeLabel(dateToTimeString(editEnd))}</Text>
          </TouchableOpacity>
        </View>
        {showEditStartPicker && (
          <DateTimePicker
            value={editStart}
            mode="time"
            display="default"
            onChange={(_, selected) => {
              setShowEditStartPicker(false);
              if (selected) setEditStart(selected);
            }}
          />
        )}
        {showEditEndPicker && (
          <DateTimePicker
            value={editEnd}
            mode="time"
            display="default"
            onChange={(_, selected) => {
              setShowEditEndPicker(false);
              if (selected) setEditEnd(selected);
            }}
          />
        )}

        <FieldLabel icon="pricetag-outline" label={t("timetable.label")} />
        <TextField placeholder={t("timetable.labelPlaceholder")} value={editLabel} onChangeText={setEditLabel} />

        <Button label={t("common.save")} onPress={handleSaveEdit} style={[styles.submitButton, { backgroundColor: sectionColors.calendar }]} />
        {editingOccurrence?.isOverridden && editScope === "day" && (
          <TouchableOpacity onPress={handleRevertOverride} style={styles.revertLink}>
            <Text style={styles.revertLinkText}>{t("timetable.revertDay")}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDeleteEdit} style={styles.deleteLinkRow}>
          <Text style={styles.deleteLinkText}>{editScope === "day" ? t("timetable.removeThisDay") : t("timetable.deleteWholeSchedule")}</Text>
        </TouchableOpacity>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  navButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  navButtonText: { fontSize: 20, fontWeight: "700", color: sectionColors.calendar },
  navCenter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  navLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  todayButton: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: sectionColors.calendar,
  },
  todayButtonText: { fontSize: 11, fontWeight: "700", color: sectionColors.calendar },
  weekModeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
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
  dayHeaderRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dayHeaderCell: { flex: 1, alignItems: "center" },
  dayHeaderInitial: { fontSize: 10, fontWeight: "700", color: colors.textFaint },
  dayHeaderNumber: { fontSize: 13, fontWeight: "700", color: colors.text },
  dayHeaderNumberToday: {
    borderWidth: 1.5,
    borderColor: sectionColors.calendar,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    color: sectionColors.calendar,
    overflow: "hidden",
  },
  scroll: { flex: 1 },
  gridRow: { flexDirection: "row", paddingHorizontal: spacing.sm },
  hourLabel: { fontSize: 10, color: colors.textFaint, transform: [{ translateY: -6 }] },
  dayColumn: { flex: 1, position: "relative" },
  hourCell: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  block: {
    position: "absolute",
    borderRadius: radii.sm,
    padding: 3,
  },
  blockText: { fontSize: 9, fontWeight: "700", color: colors.white },
  blockSubtext: { fontSize: 8, color: "rgba(255,255,255,0.85)" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dateRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
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
  submitButton: { marginTop: spacing.sm },
  revertLink: { marginTop: spacing.sm, alignItems: "center" },
  revertLinkText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  deleteLinkRow: { marginTop: spacing.sm, alignItems: "center" },
  deleteLinkText: { color: colors.danger, fontSize: 13, fontWeight: "700" },
});
