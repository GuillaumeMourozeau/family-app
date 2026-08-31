import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { TextField } from "@/components/TextField";
import { GroceryItemCategoryPicker } from "@/components/GroceryItemCategoryPicker";
import { DEFAULT_GROCERY_ITEM_CATEGORY, type GroceryItemCategory } from "@/lib/groceryItemCategories";
import { colors, spacing } from "@/lib/theme";

export type MultiGroceryRow = { name: string; itemCategory: GroceryItemCategory };

export function emptyGroceryRow(): MultiGroceryRow {
  return { name: "", itemCategory: DEFAULT_GROCERY_ITEM_CATEGORY };
}

type Props = {
  value: MultiGroceryRow[];
  onChange: (next: MultiGroceryRow[]) => void;
  tint: string;
};

// Lets a user add several items to a store in one pass instead of
// submitting the "add item" sheet once per item — each row gets its own
// name and category since a single shopping trip usually spans several
// categories (milk + apples + toothpaste, say).
export function MultiGroceryItemEditor({ value, onChange, tint }: Props) {
  const { t } = useTranslation();

  function updateRow(index: number, patch: Partial<MultiGroceryRow>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...value, emptyGroceryRow()]);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      {value.map((row, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.rowMain}>
            <TextField
              placeholder={t("groceries.itemNamePlaceholder")}
              value={row.name}
              onChangeText={(v) => updateRow(index, { name: v })}
            />
            <GroceryItemCategoryPicker
              value={row.itemCategory}
              onChange={(v) => updateRow(index, { itemCategory: v })}
              tint={tint}
            />
          </View>
          {value.length > 1 && (
            <TouchableOpacity onPress={() => removeRow(index)} hitSlop={8} style={styles.removeButton}>
              <Ionicons name="close-circle" size={20} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addRow} onPress={addRow}>
        <Ionicons name="add-circle" size={18} color={tint} />
        <Text style={[styles.addRowText, { color: tint }]}>{t("groceries.addAnotherItem")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  rowMain: { flex: 1, gap: spacing.xs },
  removeButton: { paddingTop: spacing.sm + 2 },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs },
  addRowText: { fontWeight: "700", fontSize: 13 },
});
