import { useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { FieldLabel } from "@/components/FieldLabel";
import { formatDate, formatTime } from "@/lib/dateUtils";
import { colors, radii, spacing } from "@/lib/theme";

type Props = {
  allDay: boolean;
  onAllDayChange: (allDay: boolean) => void;
  startAt: Date;
  endAt: Date;
  onStartAtChange: (date: Date) => void;
  onEndAtChange: (date: Date) => void;
  tint: string;
};

type PickerTarget = "startDate" | "startTime" | "endDate" | "endTime" | null;

export function EventDateRangePicker({
  allDay,
  onAllDayChange,
  startAt,
  endAt,
  onStartAtChange,
  onEndAtChange,
  tint,
}: Props) {
  const { t } = useTranslation();
  const [openPicker, setOpenPicker] = useState<PickerTarget>(null);

  function handleAllDayToggle(next: boolean) {
    onAllDayChange(next);
    if (next) {
      const s = new Date(startAt);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endAt);
      e.setHours(0, 0, 0, 0);
      onStartAtChange(s);
      onEndAtChange(e);
    }
  }

  function handleStartDate(selected: Date) {
    const next = new Date(startAt);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    onStartAtChange(next);
    if (endAt < next) onEndAtChange(next);
  }

  function handleStartTime(selected: Date) {
    const next = new Date(startAt);
    next.setHours(selected.getHours(), selected.getMinutes());
    onStartAtChange(next);
    if (endAt < next) onEndAtChange(next);
  }

  function handleEndDate(selected: Date) {
    const next = new Date(endAt);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    if (next < startAt) return;
    onEndAtChange(next);
  }

  function handleEndTime(selected: Date) {
    const next = new Date(endAt);
    next.setHours(selected.getHours(), selected.getMinutes());
    if (next < startAt) return;
    onEndAtChange(next);
  }

  return (
    <View>
      <View style={styles.switchRow}>
        <FieldLabel icon="sunny-outline" label={t("common.allDay")} />
        <Switch value={allDay} onValueChange={handleAllDayToggle} trackColor={{ false: colors.border, true: tint }} />
      </View>

      <FieldLabel icon="calendar-outline" label={t("calendar.starts")} />
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setOpenPicker("startDate")}>
          <Ionicons name="calendar-outline" size={15} color={tint} />
          <Text style={styles.dateButtonText}>{formatDate(startAt)}</Text>
        </TouchableOpacity>
        {!allDay && (
          <TouchableOpacity style={styles.dateButton} onPress={() => setOpenPicker("startTime")}>
            <Ionicons name="time-outline" size={15} color={tint} />
            <Text style={styles.dateButtonText}>{formatTime(startAt, { hour: "2-digit", minute: "2-digit" })}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FieldLabel icon="calendar-outline" label={t("calendar.ends")} />
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setOpenPicker("endDate")}>
          <Ionicons name="calendar-outline" size={15} color={tint} />
          <Text style={styles.dateButtonText}>{formatDate(endAt)}</Text>
        </TouchableOpacity>
        {!allDay && (
          <TouchableOpacity style={styles.dateButton} onPress={() => setOpenPicker("endTime")}>
            <Ionicons name="time-outline" size={15} color={tint} />
            <Text style={styles.dateButtonText}>{formatTime(endAt, { hour: "2-digit", minute: "2-digit" })}</Text>
          </TouchableOpacity>
        )}
      </View>

      {openPicker === "startDate" && (
        <DateTimePicker
          value={startAt}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setOpenPicker(null);
            if (selected) handleStartDate(selected);
          }}
        />
      )}
      {openPicker === "startTime" && (
        <DateTimePicker
          value={startAt}
          mode="time"
          display="default"
          onChange={(_, selected) => {
            setOpenPicker(null);
            if (selected) handleStartTime(selected);
          }}
        />
      )}
      {openPicker === "endDate" && (
        <DateTimePicker
          value={endAt}
          mode="date"
          display="default"
          onChange={(_, selected) => {
            setOpenPicker(null);
            if (selected) handleEndDate(selected);
          }}
        />
      )}
      {openPicker === "endTime" && (
        <DateTimePicker
          value={endAt}
          mode="time"
          display="default"
          onChange={(_, selected) => {
            setOpenPicker(null);
            if (selected) handleEndTime(selected);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
