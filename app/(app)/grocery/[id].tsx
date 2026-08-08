import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useGroceries } from "@/hooks/useGroceries";
import { displayPlaceName } from "@/lib/groceryPlaces";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FieldLabel } from "@/components/FieldLabel";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

export default function GroceryDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, places, updateItem, removeFromList } = useGroceries();

  const item = items.find((i) => i.id === id);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setCategoryId(item.category_id);
    setDetails(item.description ?? "");
  }, [item?.id]);

  async function handleSave() {
    if (!item || !name.trim()) return;
    setIsSaving(true);
    await updateItem(item.id, {
      name: name.trim(),
      categoryId,
      description: details.trim() || null,
    });
    setIsSaving(false);
    router.back();
  }

  function handleDelete() {
    if (!item) return;
    Alert.alert(t("groceries.removeItemConfirmTitle"), t("groceries.removeItemConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: () => {
          removeFromList(item.id);
          router.back();
        },
      },
    ]);
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("groceries.item")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("groceries.itemNotFound")}</Text>
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
        <Text style={styles.headerTitle}>{t("groceries.editItem")}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <FieldLabel icon="create-outline" label={t("groceries.name")} />
        <TextField placeholder={t("groceries.itemNamePlaceholder")} value={name} onChangeText={setName} />

        <FieldLabel icon="storefront-outline" label={t("groceries.where")} />
        <View style={styles.chipRow}>
          {places.map((p) => (
            <Chip
              key={p.id}
              label={displayPlaceName(p, t)}
              selected={categoryId === p.id}
              onPress={() => setCategoryId(p.id)}
              color={sectionColors.groceries}
            />
          ))}
        </View>

        <FieldLabel icon="document-text-outline" label={t("common.moreDetails")} />
        <TextField
          placeholder={t("groceries.detailsPlaceholder")}
          value={details}
          onChangeText={setDetails}
          multiline
          style={styles.detailsInput}
        />

        <Button label={t("common.save")} onPress={handleSave} loading={isSaving} style={styles.saveButton} />
      </ScrollView>
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
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailsInput: { minHeight: 90, textAlignVertical: "top" },
  saveButton: { marginTop: spacing.lg, backgroundColor: sectionColors.groceries },
  emptyText: { color: colors.textMuted },
});
