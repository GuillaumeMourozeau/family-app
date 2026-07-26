import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/lib/theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
};

export function FieldLabel({ icon, label, tint }: Props) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={13} color={tint ?? colors.textFaint} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  text: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
});
