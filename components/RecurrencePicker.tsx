import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { Chip } from "@/components/Chip";
import { TextField } from "@/components/TextField";
import { formatDate } from "@/lib/dateUtils";
import { colors, radii, spacing } from "@/lib/theme";
import { recurrenceSummary, type RecurrenceEndType, type RecurrenceFreq, type RecurrenceRule } from "@/lib/recurrence";

const FREQ_OPTIONS: { value: RecurrenceFreq; labelKey: string; unitKey: string }[] = [
  { value: "daily", labelKey: "calendar.daily", unitKey: "calendar.unitDaily" },
  { value: "weekly", labelKey: "calendar.weekly", unitKey: "calendar.unitWeekly" },
  { value: "monthly", labelKey: "calendar.monthly", unitKey: "calendar.unitMonthly" },
  { value: "yearly", labelKey: "calendar.yearly", unitKey: "calendar.unitYearly" },
];

const DEFAULT_RULE: RecurrenceRule = {
  freq: "weekly",
  interval: 1,
  daysOfWeek: null,
  endType: "never",
  endDate: null,
  count: null,
};

type Props = {
  value: RecurrenceRule | null;
  onChange: (value: RecurrenceRule | null) => void;
  tint: string;
};

export function RecurrencePicker({ value, onChange, tint }: Props) {
  const { t } = useTranslation();
  const dayLabels = t("calendar.weekdaysInitial", { returnObjects: true }) as string[];
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  function setFreq(freq: RecurrenceFreq) {
    onChange({ ...(value ?? DEFAULT_RULE), freq });
  }

  function setInterval(next: number) {
    if (!value || next < 1) return;
    onChange({ ...value, interval: next });
  }

  function toggleDay(day: number) {
    if (!value) return;
    const current = value.daysOfWeek ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    onChange({ ...value, daysOfWeek: next.length > 0 ? next : null });
  }

  function setEndType(endType: RecurrenceEndType) {
    if (!value) return;
    onChange({ ...value, endType });
  }

  function setCount(next: number) {
    if (!value || next < 1) return;
    onChange({ ...value, count: next });
  }

  const activeFreq = FREQ_OPTIONS.find((f) => f.value === value?.freq);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("calendar.repeat")}</Text>
      <View style={styles.chipRow}>
        <Chip label={t("calendar.doesNotRepeat")} selected={!value} onPress={() => onChange(null)} />
        {FREQ_OPTIONS.map((f) => (
          <Chip key={f.value} label={t(f.labelKey)} selected={value?.freq === f.value} onPress={() => setFreq(f.value)} />
        ))}
      </View>

      {value && (
        <>
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>{t("calendar.every")}</Text>
            <TouchableOpacity style={styles.stepperButton} onPress={() => setInterval(value.interval - 1)}>
              <Text style={styles.stepperButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{value.interval}</Text>
            <TouchableOpacity style={styles.stepperButton} onPress={() => setInterval(value.interval + 1)}>
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.stepperLabel}>
              {activeFreq ? t(activeFreq.unitKey, { count: value.interval }) : ""}
            </Text>
          </View>

          {value.freq === "weekly" && (
            <View style={styles.dayRow}>
              {dayLabels.map((label, index) => {
                const selected = (value.daysOfWeek ?? []).includes(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayCircle, selected && { backgroundColor: tint }]}
                    onPress={() => toggleDay(index)}
                  >
                    <Text style={[styles.dayCircleText, selected && styles.dayCircleTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.label}>{t("calendar.ends")}</Text>
          <View style={styles.chipRow}>
            <Chip label={t("calendar.never")} selected={value.endType === "never"} onPress={() => setEndType("never")} />
            <Chip label={t("calendar.onDate")} selected={value.endType === "on_date"} onPress={() => setEndType("on_date")} />
            <Chip label={t("calendar.afterNTimes")} selected={value.endType === "after_count"} onPress={() => setEndType("after_count")} />
          </View>

          {value.endType === "on_date" && (
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
              <Text style={styles.dateButtonText}>
                {value.endDate ? formatDate(value.endDate) : t("calendar.chooseEndDate")}
              </Text>
            </TouchableOpacity>
          )}
          {showEndDatePicker && (
            <DateTimePicker
              value={value.endDate ?? new Date()}
              mode="date"
              display="default"
              onChange={(_, selected) => {
                setShowEndDatePicker(false);
                if (selected) onChange({ ...value, endDate: selected });
              }}
            />
          )}

          {value.endType === "after_count" && (
            <View style={styles.stepperRow}>
              <TextField
                style={styles.countInput}
                keyboardType="number-pad"
                value={value.count != null ? String(value.count) : ""}
                onChangeText={(text) => setCount(parseInt(text, 10) || 1)}
                placeholder={t("calendar.timesPlaceholder")}
              />
              <Text style={styles.stepperLabel}>{t("calendar.times")}</Text>
            </View>
          )}

          <Text style={styles.summary}>{recurrenceSummary(value, t)}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepperLabel: { fontSize: 14, color: colors.text },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { fontSize: 18, fontWeight: "700", color: colors.text },
  stepperValue: { fontSize: 15, fontWeight: "700", color: colors.text, minWidth: 20, textAlign: "center" },
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
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  dateButtonText: { fontSize: 15, fontWeight: "600", color: colors.text },
  countInput: { width: 80 },
  summary: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
});
