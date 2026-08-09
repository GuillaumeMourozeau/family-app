import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Chip } from "@/components/Chip";
import { FieldLabel } from "@/components/FieldLabel";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { Button } from "@/components/Button";
import { colors, radii, spacing } from "@/lib/theme";
import { eventReminderSummary, eventReminderLabel, EVENT_REMINDER_MINUTES } from "@/lib/reminders";

type Props = {
  value: number[];
  onChange: (value: number[]) => void;
  tint: string;
};

export function EventReminderPicker({ value, onChange, tint }: Props) {
  const { t } = useTranslation();
  const [isPicking, setIsPicking] = useState(false);

  function toggle(minutes: number) {
    const next = value.includes(minutes) ? value.filter((m) => m !== minutes) : [...value, minutes];
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <FieldLabel icon="alarm-outline" label={t("calendar.reminders")} />

      {value.length > 0 ? (
        <TouchableOpacity style={[styles.summaryRow, { borderColor: tint }]} onPress={() => setIsPicking(true)}>
          <Text style={styles.summaryText} numberOfLines={2}>
            {eventReminderSummary(value, t)}
          </Text>
          <Text style={[styles.editLink, { color: tint }]}>{t("common.edit")}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.addButton, { borderColor: tint }]} onPress={() => setIsPicking(true)}>
          <Ionicons name="add" size={16} color={tint} />
          <Text style={[styles.addButtonText, { color: tint }]}>{t("calendar.addReminder")}</Text>
        </TouchableOpacity>
      )}

      <BottomSheetModal visible={isPicking} onClose={() => setIsPicking(false)}>
        <ModalTitle icon="alarm" tint={tint} tintBackground={`${tint}22`} title={t("calendar.reminders")} />
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
        {value.length === 0 && <Text style={styles.hint}>{t("calendar.noReminderHint")}</Text>}
        <Button label={t("common.done")} onPress={() => setIsPicking(false)} style={[styles.doneButton, { backgroundColor: tint }]} />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  hint: { fontSize: 12, color: colors.textFaint, fontStyle: "italic", marginTop: spacing.sm },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  addButtonText: { fontSize: 14, fontWeight: "700" },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  summaryText: { flex: 1, fontSize: 13, color: colors.text },
  editLink: { fontSize: 13, fontWeight: "700" },
  doneButton: { marginTop: spacing.md },
});
