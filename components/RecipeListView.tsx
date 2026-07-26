import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe } from "@/hooks/useRecipes";
import { RECIPE_CATEGORIES, categoryIcon, categoryLabel, type RecipeCategory } from "@/lib/recipeCategories";
import { Chip } from "@/components/Chip";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

type Props = {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
};

const UNCATEGORIZED = "uncategorized";

export function RecipeListView({ recipes, onSelectRecipe }: Props) {
  const [filter, setFilter] = useState<RecipeCategory | null>(null);

  const filtered = useMemo(
    () => (filter ? recipes.filter((r) => r.categories.includes(filter)) : recipes),
    [recipes, filter]
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, Recipe[]>();
    for (const r of filtered) {
      const keys = r.categories.length > 0 ? r.categories : [UNCATEGORIZED];
      for (const key of keys) {
        const list = groups.get(key) ?? [];
        list.push(r);
        groups.set(key, list);
      }
    }
    return groups;
  }, [filtered]);

  const orderedGroupKeys = [...RECIPE_CATEGORIES.map((c) => c.id), UNCATEGORIZED].filter((key) => grouped.has(key));

  return (
    <View>
      <View style={styles.filterRow}>
        <Chip label="All" selected={filter === null} onPress={() => setFilter(null)} color={sectionColors.meals} />
        {RECIPE_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.icon}
            selected={filter === c.id}
            onPress={() => setFilter(c.id)}
            color={sectionColors.meals}
          />
        ))}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>No recipes yet.</Text>
      ) : (
        orderedGroupKeys.map((key) => (
          <View key={key} style={styles.group}>
            <View style={styles.groupHeader}>
              <Ionicons
                name={key === UNCATEGORIZED ? "restaurant-outline" : categoryIcon(key as RecipeCategory)}
                size={14}
                color={sectionColors.meals}
              />
              <Text style={styles.groupHeaderText}>
                {key === UNCATEGORIZED ? "Uncategorized" : categoryLabel(key as RecipeCategory)}
              </Text>
            </View>
            {(grouped.get(key) ?? []).map((r) => (
              <TouchableOpacity key={r.id} style={styles.row} onPress={() => onSelectRecipe(r)}>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>{r.name}</Text>
                  <Text style={styles.rowMeta}>
                    {r.ingredients.length} ingredient{r.ingredients.length === 1 ? "" : "s"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </TouchableOpacity>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  group: { marginBottom: spacing.md },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowTextContainer: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
