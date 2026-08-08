import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Chip } from "@/components/Chip";
import { FieldLabel } from "@/components/FieldLabel";
import { colors, spacing } from "@/lib/theme";
import { eventReminderSummary, eventReminderLabel, EVENT_REMINDER_MINUTES } from "@/lib/reminders";

type Props = {
  value: number[];
  onChange: (value: number[]) => void;
  tint: string;
};

export function EventReminderPicker({ value, onChange, tint }: Props) {
  const { t } = useTranslation();
  function toggle(minutes: number) {
    const next = value.includes(minutes) ? value.filter((m) => m !== minutes) : [...value, minutes];
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <FieldLabel icon="alarm-outline" label={t("calendar.reminders")} />
      <View style={styles.chipRow}>
        {EVENT_REMINDER_MINUTES.map((minutes) => (
          <Chip
            key={minutes}
            label={eventReminderLabel(minutes, t)}
            selected={value.includes(minutes)}
            onPress={() => toggle(minutes)}
            color={tint}
          />
        ))}
      </View>
      {value.length === 0 ? (
        <Text style={styles.hint}>{t("calendar.noReminderHint")}</Text>
      ) : (
        <Text style={styles.summary}>{eventReminderSummary(value, t)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  hint: { fontSize: 12, color: colors.textFaint, fontStyle: "italic" },
  summary: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
});
