import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { IngredientInput } from "@/hooks/useRecipes";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/lib/theme";

type Props = {
  value: IngredientInput[];
  onChange: (next: IngredientInput[]) => void;
  tint?: string;
};

export function IngredientListEditor({ value, onChange, tint = colors.primary }: Props) {
  function updateRow(index: number, patch: Partial<IngredientInput>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...value, { quantity: "", name: "" }]);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      {value.map((row, index) => (
        <View key={index} style={styles.row}>
          <TextField
            style={styles.nameInput}
            placeholder="Ingredient"
            value={row.name}
            onChangeText={(v) => updateRow(index, { name: v })}
          />
          <TextField
            style={styles.qtyInput}
            placeholder="Qty"
            value={row.quantity}
            onChangeText={(v) => updateRow(index, { quantity: v })}
          />
          <TouchableOpacity onPress={() => removeRow(index)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.textFaint} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addRow} onPress={addRow}>
        <Ionicons name="add-circle" size={18} color={tint} />
        <Text style={[styles.addRowText, { color: tint }]}>Add ingredient</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  nameInput: { flex: 3 },
  qtyInput: { flex: 2 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  addRowText: { fontWeight: "700", fontSize: 13 },
});
