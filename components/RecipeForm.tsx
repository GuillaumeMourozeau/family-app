import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { IngredientInput } from "@/hooks/useRecipes";
import { RECIPE_CATEGORIES, type RecipeCategory } from "@/lib/recipeCategories";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { Chip } from "@/components/Chip";
import { FieldLabel } from "@/components/FieldLabel";
import { IngredientListEditor } from "@/components/IngredientListEditor";
import { spacing, sectionColors } from "@/lib/theme";

export type RecipeFormValue = {
  name: string;
  details: string;
  categories: RecipeCategory[];
  ingredients: IngredientInput[];
};

type Props = {
  initial?: Partial<RecipeFormValue>;
  submitLabel: string;
  isSaving?: boolean;
  onSubmit: (value: RecipeFormValue) => void;
};

export function RecipeForm({ initial, submitLabel, isSaving, onSubmit }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [details, setDetails] = useState(initial?.details ?? "");
  const [categories, setCategories] = useState<RecipeCategory[]>(initial?.categories ?? []);
  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    initial?.ingredients?.length ? initial.ingredients : [{ quantity: "", name: "" }]
  );

  function toggleCategory(id: RecipeCategory) {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), details: details.trim(), categories, ingredients });
  }

  return (
    <View style={styles.container}>
      <FieldLabel icon="restaurant-outline" label={t("common.name")} />
      <TextField placeholder={t("meals.recipeNamePlaceholder")} value={name} onChangeText={setName} />

      <FieldLabel icon="pricetags-outline" label={t("meals.categoryOptional")} />
      <View style={styles.chipRow}>
        {RECIPE_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={t(`common.recipeCategories.${c.id}`)}
            icon={c.icon}
            selected={categories.includes(c.id)}
            onPress={() => toggleCategory(c.id)}
            color={sectionColors.meals}
          />
        ))}
      </View>

      <FieldLabel icon="list-outline" label={t("meals.ingredients")} />
      <IngredientListEditor value={ingredients} onChange={setIngredients} tint={sectionColors.meals} />

      <FieldLabel icon="document-text-outline" label={t("meals.details")} />
      <TextField
        placeholder={t("meals.detailsPlaceholder")}
        value={details}
        onChangeText={setDetails}
        multiline
        style={styles.detailsInput}
      />

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={isSaving}
        style={[styles.submitButton, { backgroundColor: sectionColors.meals }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailsInput: { minHeight: 90, textAlignVertical: "top" },
  submitButton: { marginTop: spacing.lg },
});
