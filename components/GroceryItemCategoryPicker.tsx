import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GroceryStoreIcon } from "@/components/GroceryStoreIcon";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import {
  GROCERY_ITEM_CATEGORIES,
  GROCERY_ITEM_CATEGORY_ICONS,
  type GroceryItemCategory,
} from "@/lib/groceryItemCategories";
import { colors, radii, spacing } from "@/lib/theme";

type Props = {
  value: GroceryItemCategory;
  onChange: (next: GroceryItemCategory) => void;
  tint: string;
};

export function GroceryItemCategoryPicker({ value, onChange, tint }: Props) {
  const { t } = useTranslation();
  const [isPicking, setIsPicking] = useState(false);

  return (
    <>
      <TouchableOpacity style={[styles.badge, { borderColor: tint }]} onPress={() => setIsPicking(true)}>
        <GroceryStoreIcon icon={GROCERY_ITEM_CATEGORY_ICONS[value]} size={14} color={tint} />
        <Text style={[styles.badgeText, { color: tint }]}>{t(`groceries.itemCategories.${value}`)}</Text>
      </TouchableOpacity>

      <BottomSheetModal visible={isPicking} onClose={() => setIsPicking(false)}>
        <ModalTitle icon="pricetag-outline" tint={tint} tintBackground={`${tint}22`} title={t("groceries.chooseCategory")} />
        <View style={styles.grid}>
          {GROCERY_ITEM_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.option, cat === value && { backgroundColor: tint }]}
              onPress={() => {
                onChange(cat);
                setIsPicking(false);
              }}
            >
              <GroceryStoreIcon icon={GROCERY_ITEM_CATEGORY_ICONS[cat]} size={16} color={cat === value ? colors.white : colors.textMuted} />
              <Text style={[styles.optionText, cat === value && styles.optionTextSelected]}>
                {t(`groceries.itemCategories.${cat}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  optionText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  optionTextSelected: { color: colors.white },
});
