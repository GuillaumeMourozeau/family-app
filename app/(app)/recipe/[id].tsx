import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRecipes } from "@/hooks/useRecipes";
import { RecipeForm, type RecipeFormValue } from "@/components/RecipeForm";
import { AddIngredientsToGroceriesModal } from "@/components/AddIngredientsToGroceriesModal";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

export default function RecipeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipes();

  const recipe = isNew ? undefined : recipes.find((r) => r.id === id);

  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToGroceries, setIsAddingToGroceries] = useState(false);

  async function handleSubmit(value: RecipeFormValue) {
    setIsSaving(true);
    if (isNew) {
      const { error, recipe: created } = await addRecipe(
        value.name,
        value.details || null,
        value.categories,
        value.ingredients
      );
      setIsSaving(false);
      if (error || !created) {
        Alert.alert(t("meals.couldntSaveRecipe"), error ?? t("common.somethingWentWrong"));
        return;
      }
      router.back();
    } else if (recipe) {
      await updateRecipe(recipe.id, value.name, value.details || null, value.categories, value.ingredients);
      setIsSaving(false);
      router.back();
    }
  }

  function handleDelete() {
    if (!recipe) return;
    Alert.alert(t("meals.deleteRecipeTitle"), t("common.thisCantBeUndone"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          deleteRecipe(recipe.id);
          router.back();
        },
      },
    ]);
  }

  if (!isNew && !recipe) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("meals.recipe")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("meals.recipeNotFound")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isNew ? t("meals.newRecipe") : t("meals.editRecipe")}</Text>
        {!isNew ? (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <RecipeForm
          initial={
            recipe
              ? {
                  name: recipe.name,
                  details: recipe.details ?? "",
                  categories: recipe.categories,
                  ingredients: recipe.ingredients.map((i) => ({ quantity: i.quantity ?? "", name: i.name })),
                }
              : undefined
          }
          submitLabel={t("common.save")}
          isSaving={isSaving}
          onSubmit={handleSubmit}
        />

        {!isNew && (
          <TouchableOpacity style={styles.groceryButton} onPress={() => setIsAddingToGroceries(true)}>
            <Ionicons name="cart-outline" size={16} color={sectionColors.groceries} />
            <Text style={styles.groceryButtonText}>{t("meals.addIngredientsToGroceryList")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {recipe && (
        <AddIngredientsToGroceriesModal
          visible={isAddingToGroceries}
          onClose={() => setIsAddingToGroceries(false)}
          ingredients={recipe.ingredients.map((i) => ({ quantity: i.quantity, name: i.name }))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  headerSpacer: { width: 24 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  groceryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: sectionColors.groceries,
  },
  groceryButtonText: { color: sectionColors.groceries, fontWeight: "700", fontSize: 14 },
  emptyText: { color: colors.textMuted },
});
