import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useCalendarPrefs } from "@/hooks/useCalendarPrefs";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { Chip } from "@/components/Chip";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { getMemberColor } from "@/lib/memberColors";
import type { SchoolZone } from "@/lib/frenchHolidays";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

const ZONES: SchoolZone[] = ["A", "B", "C"];

export default function CalendarSettingsScreen() {
  const { t } = useTranslation();
  const { prefs, updatePrefs } = useCalendarPrefs();
  const { members, updateMemberColor } = useFamilyMembers();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("calendarSettings.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>{t("calendarSettings.holidays")}</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.rowLabel}>{t("calendarSettings.publicHolidays")}</Text>
            <Switch
              value={prefs.show_public_holidays}
              onValueChange={(v) => updatePrefs({ show_public_holidays: v })}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.rowLabel}>{t("calendarSettings.schoolHolidays")}</Text>
            <Switch
              value={prefs.show_school_holidays}
              onValueChange={(v) => updatePrefs({ show_school_holidays: v })}
            />
          </View>
          <Text style={styles.label}>{t("calendarSettings.schoolHolidayZone")}</Text>
          <View style={styles.chipRow}>
            {ZONES.map((zone) => (
              <Chip
                key={zone}
                label={t("calendarSettings.zone", { zone })}
                selected={prefs.school_zone === zone}
                onPress={() => updatePrefs({ school_zone: zone })}
              />
            ))}
          </View>
          <Text style={styles.label}>{t("calendarSettings.color")}</Text>
          <ColorSwatchPicker
            value={prefs.holiday_color}
            onChange={(color) => updatePrefs({ holiday_color: color })}
          />
        </View>

        <Text style={styles.sectionLabel}>{t("calendarSettings.memberColors")}</Text>
        <View style={styles.card}>
          {members.map((m, index) => (
            <View key={m.id} style={[styles.memberRow, index === members.length - 1 && styles.memberRowLast]}>
              <Text style={styles.rowLabel}>{m.full_name ?? t("common.member")}</Text>
              <ColorSwatchPicker value={getMemberColor(m)} onChange={(color) => updateMemberColor(m.id, color)} />
            </View>
          ))}
        </View>
      </ScrollView>
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
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  headerSpacer: { width: 24 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  memberRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  memberRowLast: { borderBottomWidth: 0 },
});
