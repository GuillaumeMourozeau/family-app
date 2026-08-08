import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRecipes } from "@/hooks/useRecipes";
import { RecipeListView } from "@/components/RecipeListView";
import { colors, sectionColors, spacing } from "@/lib/theme";

export default function RecipesScreen() {
  const { t } = useTranslation();
  const { recipes } = useRecipes();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("meals.recipesTitle")}</Text>
        <TouchableOpacity onPress={() => router.push("/recipe/new")}>
          <Ionicons name="add-circle" size={26} color={sectionColors.meals} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <RecipeListView recipes={recipes} onSelectRecipe={(r) => router.push(`/recipe/${r.id}`)} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  content: { padding: spacing.lg, paddingTop: 0, paddingBottom: 40 },
});
