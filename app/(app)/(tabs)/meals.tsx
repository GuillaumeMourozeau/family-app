import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useMealPlan, type MealPlanEntry, type MealType } from "@/hooks/useMealPlan";
import { useRecipes, type Recipe } from "@/hooks/useRecipes";
import { formatDate, startOfWeek } from "@/lib/dateUtils";
import { MEAL_TYPES, MEAL_TYPE_ORDER, MEAL_TYPE_ICONS } from "@/lib/mealTypes";
import { TabScreenHeader } from "@/components/TabScreenHeader";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { RecipeForm, type RecipeFormValue } from "@/components/RecipeForm";
import { RecipeListView } from "@/components/RecipeListView";
import { AddIngredientsToGroceriesModal } from "@/components/AddIngredientsToGroceriesModal";
import { colors, radii, sectionColors, sectionTints, spacing } from "@/lib/theme";

type AddMode = "quick" | "existing" | "new";

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function MealsScreen() {
  const { t } = useTranslation();
  const { entries, isLoading, addMeal, deleteMeal } = useMealPlan();
  const { recipes, addRecipe } = useRecipes();

  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [addingForDate, setAddingForDate] = useState<string | null>(null);
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [addMode, setAddMode] = useState<AddMode>("quick");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [serves, setServes] = useState("");
  const [mealDetails, setMealDetails] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingRecipe, setIsPickingRecipe] = useState(false);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [isCreatingRecipeSaving, setIsCreatingRecipeSaving] = useState(false);
  const [addingIngredientsForEntry, setAddingIngredientsForEntry] = useState<MealPlanEntry | null>(null);

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<string, MealPlanEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type]);
    }
    return map;
  }, [entries]);

  function navigateWeek(dir: -1 | 1) {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + dir * 7);
    setWeekAnchor(next);
  }

  function openAddMeal(dateKey: string) {
    setAddingForDate(dateKey);
    setMealType("dinner");
    setAddMode("quick");
    setSelectedRecipe(null);
    setQuickTitle("");
    setServes("");
    setMealDetails("");
  }

  async function handleSubmitMeal() {
    if (!addingForDate) return;
    const servesNum = serves.trim() ? Number(serves.trim()) : null;

    if (addMode === "quick") {
      if (!quickTitle.trim()) return;
      setIsSaving(true);
      await addMeal({
        date: addingForDate,
        mealType,
        recipeId: null,
        title: quickTitle.trim(),
        serves: servesNum,
        details: mealDetails.trim() || null,
      });
      setIsSaving(false);
    } else {
      if (!selectedRecipe) return;
      setIsSaving(true);
      await addMeal({
        date: addingForDate,
        mealType,
        recipeId: selectedRecipe.id,
        title: selectedRecipe.name,
        serves: servesNum,
        details: mealDetails.trim() || null,
      });
      setIsSaving(false);
    }
    setAddingForDate(null);
  }

  async function handleCreateRecipe(value: RecipeFormValue) {
    setIsCreatingRecipeSaving(true);
    const { recipe, error } = await addRecipe(value.name, value.details || null, value.categories, value.ingredients);
    setIsCreatingRecipeSaving(false);
    if (error || !recipe) return;
    setSelectedRecipe(recipe);
    setIsCreatingRecipe(false);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TabScreenHeader
        title={t("meals.tabTitle")}
        icon="restaurant"
        tint={sectionColors.meals}
        tintBackground={sectionTints.meals}
        actionLabel={t("meals.recipesAction")}
        onAction={() => router.push("/recipes")}
      />

      <View style={styles.weekNavRow}>
        <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {t("meals.weekOf", { date: formatDate(weekStart, { month: "short", day: "numeric" }) })}
        </Text>
        <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const dayEntries = entriesByDate.get(dateKey) ?? [];
          return (
            <View key={dateKey} style={styles.dayCard}>
              <Text style={styles.dayHeading}>
                {formatDate(day, { weekday: "long", month: "short", day: "numeric" })}
              </Text>
              {dayEntries.length === 0 ? (
                <Text style={styles.emptyText}>{t("meals.noMealsPlanned")}</Text>
              ) : (
                dayEntries.map((entry) => (
                  <View key={entry.id} style={styles.mealRow}>
                    <View style={styles.mealIconBadge}>
                      <Ionicons name={MEAL_TYPE_ICONS[entry.meal_type]} size={14} color={sectionColors.meals} />
                    </View>
                    <View style={styles.mealTextContainer}>
                      <Text style={styles.mealTitle}>{entry.title}</Text>
                      <Text style={styles.mealMeta}>
                        {t(`common.mealTypes.${entry.meal_type}`)}
                        {entry.serves ? t("meals.serves", { count: entry.serves }) : ""}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setAddingIngredientsForEntry(entry)} hitSlop={8}>
                      <Ionicons name="cart-outline" size={18} color={sectionColors.groceries} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteMeal(entry.id)} hitSlop={8}>
                      <Text style={styles.deleteLink}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
              <TouchableOpacity style={styles.addMealButton} onPress={() => openAddMeal(dateKey)}>
                <Ionicons name="add-circle-outline" size={16} color={sectionColors.meals} />
                <Text style={styles.addMealButtonText}>{t("meals.addMeal")}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <BottomSheetModal visible={!!addingForDate} onClose={() => setAddingForDate(null)}>
        <ModalTitle icon="restaurant" tint={sectionColors.meals} tintBackground={sectionTints.meals} title={t("meals.newMeal")} />

        <FieldLabel icon="time-outline" label={t("meals.mealType")} />
        <View style={styles.chipRow}>
          {MEAL_TYPES.map((mt) => (
            <Chip
              key={mt}
              label={t(`common.mealTypes.${mt}`)}
              icon={MEAL_TYPE_ICONS[mt]}
              selected={mealType === mt}
              onPress={() => setMealType(mt)}
              color={sectionColors.meals}
            />
          ))}
        </View>

        <FieldLabel icon="book-outline" label={t("meals.menu")} />
        <View style={styles.chipRow}>
          <Chip
            label={t("meals.quickMenu")}
            selected={addMode === "quick"}
            onPress={() => {
              setAddMode("quick");
              setSelectedRecipe(null);
            }}
            color={sectionColors.meals}
          />
          <Chip
            label={t("meals.existingRecipe")}
            selected={addMode === "existing"}
            onPress={() => {
              setAddMode("existing");
              setSelectedRecipe(null);
            }}
            color={sectionColors.meals}
          />
          <Chip
            label={t("meals.newRecipeChip")}
            selected={addMode === "new"}
            onPress={() => {
              setAddMode("new");
              setSelectedRecipe(null);
            }}
            color={sectionColors.meals}
          />
        </View>

        {addMode === "quick" && (
          <TextField placeholder={t("meals.whatsForDinnerPlaceholder")} value={quickTitle} onChangeText={setQuickTitle} />
        )}

        {addMode === "existing" &&
          (selectedRecipe ? (
            <View style={styles.selectedRecipeRow}>
              <Text style={styles.selectedRecipeText}>{t("meals.selected", { name: selectedRecipe.name })}</Text>
              <TouchableOpacity onPress={() => setIsPickingRecipe(true)}>
                <Text style={styles.changeLink}>{t("meals.change")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.browseButton} onPress={() => setIsPickingRecipe(true)}>
              <Ionicons name="search-outline" size={16} color={sectionColors.meals} />
              <Text style={styles.browseButtonText}>{t("meals.browseRecipes")}</Text>
            </TouchableOpacity>
          ))}

        {addMode === "new" &&
          (selectedRecipe ? (
            <View style={styles.selectedRecipeRow}>
              <Text style={styles.selectedRecipeText}>{t("meals.created", { name: selectedRecipe.name })}</Text>
              <TouchableOpacity onPress={() => setIsCreatingRecipe(true)}>
                <Text style={styles.changeLink}>{t("meals.change")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.browseButton} onPress={() => setIsCreatingRecipe(true)}>
              <Ionicons name="add-circle-outline" size={16} color={sectionColors.meals} />
              <Text style={styles.browseButtonText}>{t("meals.createARecipe")}</Text>
            </TouchableOpacity>
          ))}

        <FieldLabel icon="people-outline" label={t("meals.servesOptional")} />
        <TextField placeholder={t("meals.servesPlaceholder")} keyboardType="number-pad" value={serves} onChangeText={setServes} />

        <FieldLabel icon="document-text-outline" label={t("meals.notesOptional")} />
        <TextField placeholder={t("meals.notesPlaceholder")} value={mealDetails} onChangeText={setMealDetails} />

        <Button label={t("meals.addMeal")} onPress={handleSubmitMeal} loading={isSaving} style={styles.submitButton} />
      </BottomSheetModal>

      <BottomSheetModal visible={isPickingRecipe} onClose={() => setIsPickingRecipe(false)}>
        <ModalTitle icon="search" tint={sectionColors.meals} tintBackground={sectionTints.meals} title={t("meals.chooseRecipe")} />
        <RecipeListView
          recipes={recipes}
          onSelectRecipe={(r) => {
            setSelectedRecipe(r);
            setIsPickingRecipe(false);
          }}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={isCreatingRecipe} onClose={() => setIsCreatingRecipe(false)}>
        <ModalTitle icon="add-circle" tint={sectionColors.meals} tintBackground={sectionTints.meals} title={t("meals.newRecipeTitle")} />
        <RecipeForm submitLabel={t("meals.createRecipe")} isSaving={isCreatingRecipeSaving} onSubmit={handleCreateRecipe} />
      </BottomSheetModal>

      <AddIngredientsToGroceriesModal
        visible={!!addingIngredientsForEntry}
        onClose={() => setAddingIngredientsForEntry(null)}
        ingredients={
          recipes
            .find((r) => r.id === addingIngredientsForEntry?.recipe_id)
            ?.ingredients.map((i) => ({ quantity: i.quantity, name: i.name })) ?? []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  navButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  navButtonText: { fontSize: 20, fontWeight: "700", color: sectionColors.meals },
  weekLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
  listContent: { padding: spacing.lg, paddingTop: 0, paddingBottom: 40, gap: spacing.md },
  dayCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  dayHeading: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.xs },
  emptyText: { fontSize: 13, color: colors.textFaint, paddingVertical: spacing.xs },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  mealIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: sectionTints.meals,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTextContainer: { flex: 1 },
  mealTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  mealMeta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  deleteLink: { color: colors.textFaint, fontSize: 16, paddingHorizontal: spacing.sm },
  addMealButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  addMealButtonText: { color: sectionColors.meals, fontWeight: "700", fontSize: 13 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  submitButton: { marginTop: spacing.sm, backgroundColor: sectionColors.meals },
  browseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: sectionColors.meals,
  },
  browseButtonText: { color: sectionColors.meals, fontWeight: "700", fontSize: 14 },
  selectedRecipeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: sectionTints.meals,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  selectedRecipeText: { fontSize: 14, fontWeight: "700", color: colors.text, flexShrink: 1 },
  changeLink: { color: sectionColors.meals, fontWeight: "700", fontSize: 13 },
});
