import { StyleSheet, Text, View } from "react-native";
import { Chip } from "@/components/Chip";
import { FieldLabel } from "@/components/FieldLabel";
import { colors, spacing } from "@/lib/theme";
import { eventReminderSummary, EVENT_REMINDER_OPTIONS } from "@/lib/reminders";

type Props = {
  value: number[];
  onChange: (value: number[]) => void;
  tint: string;
};

export function EventReminderPicker({ value, onChange, tint }: Props) {
  function toggle(minutes: number) {
    const next = value.includes(minutes) ? value.filter((m) => m !== minutes) : [...value, minutes];
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <FieldLabel icon="alarm-outline" label="Reminders" />
      <View style={styles.chipRow}>
        {EVENT_REMINDER_OPTIONS.map((option) => (
          <Chip
            key={option.minutes}
            label={option.label}
            selected={value.includes(option.minutes)}
            onPress={() => toggle(option.minutes)}
            color={tint}
          />
        ))}
      </View>
      {value.length === 0 ? (
        <Text style={styles.hint}>No reminder — tap one or more above to add one.</Text>
      ) : (
        <Text style={styles.summary}>{eventReminderSummary(value)}</Text>
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
