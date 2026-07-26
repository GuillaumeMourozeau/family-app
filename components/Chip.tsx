import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing } from "@/lib/theme";

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Chip({ label, selected, onPress, color, icon }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected, selected && color ? { backgroundColor: color } : null]}
      onPress={onPress}
    >
      <View style={styles.row}>
        {icon && <Ionicons name={icon} size={13} color={selected ? colors.white : colors.textMuted} />}
        <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary },
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  text: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  textSelected: { color: colors.white },
});
