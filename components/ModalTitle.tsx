import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/lib/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintBackground: string;
  title: string;
};

export function ModalTitle({ icon, tint, tintBackground, title }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: tintBackground }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
});
