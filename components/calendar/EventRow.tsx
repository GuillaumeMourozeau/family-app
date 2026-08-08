import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import type { CalendarEvent } from "@/hooks/useEvents";
import type { FamilyMember } from "@/hooks/useFamilyMembers";
import { useProfile } from "@/hooks/useProfile";
import { getEventDotColors } from "@/lib/memberColors";
import { isNewItem } from "@/lib/newBadge";
import { formatTime } from "@/lib/dateUtils";
import { colors, radii, spacing } from "@/lib/theme";

type Props = {
  event: CalendarEvent;
  startAt: Date;
  members: FamilyMember[];
  onDelete: () => void;
};

export function EventRow({ event, startAt, members, onDelete }: Props) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const participantNames = event.applies_to_whole_family
    ? t("common.wholeFamily")
    : event.participant_ids
        .map((id) => members.find((m) => m.id === id)?.full_name)
        .filter(Boolean)
        .join(", ") || t("common.unassigned");
  const dotColors = getEventDotColors(event, members);

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={() => router.push(`/event/${event.id}`)}>
        <View style={styles.dotStack}>
          {dotColors.map((c, i) => (
            <View key={i} style={[styles.typeDot, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={styles.rowTextContainer}>
          <View style={styles.rowTitleLine}>
            {event.is_private && <Text style={styles.lockIcon}>🔒</Text>}
            <Text style={styles.rowTitle}>{event.title}</Text>
            {event.recurrence_freq && <Text style={styles.repeatIcon}>🔁</Text>}
            {isNewItem(event.created_at, event.created_by, profile) && <Text style={styles.newBadge}>{t("common.new")}</Text>}
          </View>
          <Text style={styles.rowSubtitle}>
            {event.all_day ? t("common.allDay") : formatTime(startAt, { hour: "2-digit", minute: "2-digit" })}
            {"  ·  "}
            {participantNames}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteLink}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  rowMain: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.md },
  dotStack: { flexDirection: "row", gap: 3 },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  rowTextContainer: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lockIcon: { fontSize: 12 },
  repeatIcon: { fontSize: 12 },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  newBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  rowSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  deleteLink: { color: colors.textFaint, fontSize: 16, paddingHorizontal: spacing.sm },
});
