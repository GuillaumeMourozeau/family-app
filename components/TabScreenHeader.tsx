import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  title: string;
  icon: IconName;
  tint: string;
  tintBackground: string;
  actionLabel?: string;
  onAction?: () => void;
  onIconPress?: () => void;
};

export function TabScreenHeader({ title, icon, tint, tintBackground, actionLabel, onAction, onIconPress }: Props) {
  const iconBadge = (
    <View style={[styles.iconBadge, { backgroundColor: tintBackground }]}>
      <Ionicons name={icon} size={18} color={tint} />
    </View>
  );
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {onIconPress ? <TouchableOpacity onPress={onIconPress}>{iconBadge}</TouchableOpacity> : iconBadge}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={[styles.actionButton, { backgroundColor: tint }]}>
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  actionLabel: { color: colors.white, fontSize: 13, fontWeight: "700" },
});
