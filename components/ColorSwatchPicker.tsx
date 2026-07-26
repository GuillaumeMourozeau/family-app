import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MEMBER_COLOR_PALETTE } from "@/lib/memberColors";
import { colors, spacing } from "@/lib/theme";

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorSwatchPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {MEMBER_COLOR_PALETTE.map((c) => (
        <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }]} onPress={() => onChange(c)}>
          {value === c && <Ionicons name="checkmark" size={16} color={colors.white} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
