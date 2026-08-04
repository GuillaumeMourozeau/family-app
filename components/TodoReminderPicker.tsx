import { useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Chip } from "@/components/Chip";
import { FieldLabel } from "@/components/FieldLabel";
import { colors, spacing } from "@/lib/theme";
import { todoReminderSummary, WEEKDAY_LABELS, type TodoReminder, type TodoReminderFreq } from "@/lib/reminders";

const DEFAULT_REMINDER: TodoReminder = { freq: "daily", time: "09:00", weekday: new Date().getDay() };

function timeToDate(time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  value: TodoReminder | null;
  onChange: (value: TodoReminder | null) => void;
  tint: string;
};

export function TodoReminderPicker({ value, onChange, tint }: Props) {
  const [showTimePicker, setShowTimePicker] = useState(false);

  function setFreq(freq: TodoReminderFreq) {
    onChange({ ...(value ?? DEFAULT_REMINDER), freq });
  }

  function setWeekday(weekday: number) {
    if (!value) return;
    onChange({ ...value, weekday });
  }

  return (
    <View style={styles.container}>
      <View style={styles.switchRow}>
        <FieldLabel icon="alarm-outline" label="Reminder" />
        <Switch
          value={!!value}
          onValueChange={(enabled) => onChange(enabled ? DEFAULT_REMINDER : null)}
          trackColor={{ false: colors.border, true: tint }}
        />
      </View>

      {value && (
        <>
          <View style={styles.chipRow}>
            <Chip label="Every day" selected={value.freq === "daily"} onPress={() => setFreq("daily")} />
            <Chip label="Every week" selected={value.freq === "weekly"} onPress={() => setFreq("weekly")} />
          </View>

          {value.freq === "weekly" && (
            <View style={styles.dayRow}>
              {WEEKDAY_LABELS.map((label, index) => {
                const selected = (value.weekday ?? 0) === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayCircle, selected && { backgroundColor: tint }]}
                    onPress={() => setWeekday(index)}
                  >
                    <Text style={[styles.dayCircleText, selected && styles.dayCircleTextSelected]}>{label[0]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={15} color={tint} />
            <Text style={styles.timeButtonText}>{todoReminderSummary(value)}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={timeToDate(value.time)}
              mode="time"
              display="default"
              onChange={(_, selected) => {
                setShowTimePicker(false);
                if (selected) onChange({ ...value, time: dateToTime(selected) });
              }}
            />
          )}

          <Text style={styles.summary}>Repeats until this task is marked done.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dayRow: { flexDirection: "row", gap: spacing.sm },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  dayCircleTextSelected: { color: colors.white },
  timeButton: {
    flexDirection: "row",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  timeButtonText: { fontSize: 15, fontWeight: "600", color: colors.text },
  summary: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
});
