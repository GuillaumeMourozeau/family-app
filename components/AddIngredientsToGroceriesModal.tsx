import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useGroceries } from "@/hooks/useGroceries";
import { displayPlaceName } from "@/lib/groceryPlaces";
import type { IngredientInput } from "@/hooks/useRecipes";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { IngredientListEditor } from "@/components/IngredientListEditor";
import { FieldLabel } from "@/components/FieldLabel";
import { colors, sectionColors, sectionTints, spacing } from "@/lib/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  ingredients: { quantity: string | null; name: string }[];
};

export function AddIngredientsToGroceriesModal({ visible, onClose, ingredients }: Props) {
  const { t } = useTranslation();
  const { places, defaultPlace, addItem } = useGroceries();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [customRows, setCustomRows] = useState<IngredientInput[]>([{ quantity: "", name: "" }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setChecked(Object.fromEntries(ingredients.map((_, i) => [i, true])));
    setPlaceId(defaultPlace?.id ?? null);
    setCustomRows([{ quantity: "", name: "" }]);
  }, [visible]);

  function toggle(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  async function handleAdd() {
    setIsSaving(true);
    for (let i = 0; i < ingredients.length; i++) {
      if (!checked[i]) continue;
      const label = [ingredients[i].quantity, ingredients[i].name].filter(Boolean).join(" ");
      await addItem(label, placeId);
    }
    for (const row of customRows) {
      if (!row.name.trim()) continue;
      const label = [row.quantity, row.name].filter(Boolean).join(" ");
      await addItem(label, placeId);
    }
    setIsSaving(false);
    onClose();
  }

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <ModalTitle
        icon="cart-outline"
        tint={sectionColors.groceries}
        tintBackground={sectionTints.groceries}
        title={t("groceries.addToGroceryList")}
      />

      {ingredients.length > 0 && (
        <>
          <FieldLabel icon="list-outline" label={t("groceries.uncheckWhatYouHave")} />
          <View style={styles.checkList}>
            {ingredients.map((ing, i) => {
              const isChecked = checked[i] ?? true;
              const label = [ing.quantity, ing.name].filter(Boolean).join(" ");
              return (
                <TouchableOpacity key={i} style={styles.checkRow} onPress={() => toggle(i)}>
                  <Ionicons
                    name={isChecked ? "checkbox" : "square-outline"}
                    size={20}
                    color={isChecked ? sectionColors.groceries : colors.textFaint}
                  />
                  <Text style={[styles.checkLabel, !isChecked && styles.checkLabelUnchecked]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <FieldLabel icon="add-circle-outline" label={ingredients.length > 0 ? t("groceries.addMoreItems") : t("groceries.whatDoYouNeed")} />
      <IngredientListEditor value={customRows} onChange={setCustomRows} tint={sectionColors.groceries} />

      <FieldLabel icon="storefront-outline" label={t("groceries.store")} />
      <View style={styles.chipRow}>
        {places.map((p) => (
          <Chip
            key={p.id}
            label={displayPlaceName(p, t)}
            selected={placeId === p.id}
            onPress={() => setPlaceId(p.id)}
            color={sectionColors.groceries}
          />
        ))}
      </View>

      <Button
        label={t("groceries.addToList")}
        onPress={handleAdd}
        loading={isSaving}
        style={[styles.submitButton, { backgroundColor: sectionColors.groceries }]}
      />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  checkList: { gap: spacing.xs },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 4 },
  checkLabel: { fontSize: 14, color: colors.text, flexShrink: 1 },
  checkLabelUnchecked: { color: colors.textFaint, textDecorationLine: "line-through" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  submitButton: { marginTop: spacing.sm },
});
