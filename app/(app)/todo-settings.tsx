import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
import { getMemberColor } from "@/lib/memberColors";
import { colors, radii, spacing } from "@/lib/theme";

export default function TodoSettingsScreen() {
  const { members, updateMemberColor } = useFamilyMembers();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>To-Do Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Member colors</Text>
        <Text style={styles.helperText}>Kept in sync with the Calendar tab.</Text>
        <View style={styles.card}>
          {members.map((m, index) => (
            <View key={m.id} style={[styles.memberRow, index === members.length - 1 && styles.memberRowLast]}>
              <Text style={styles.rowLabel}>{m.full_name ?? "Member"}</Text>
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
    marginBottom: spacing.xs,
  },
  helperText: { fontSize: 13, color: colors.textFaint, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  rowLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
  memberRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  memberRowLast: { borderBottomWidth: 0 },
});
