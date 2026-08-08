import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTodoCategories } from "@/hooks/useTodoCategories";
import { TODO_CATEGORY_ICONS } from "@/lib/todoCategoryIcons";
import type { TodoPriority } from "@/hooks/useTodos";
import { Chip } from "@/components/Chip";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, radii, sectionColors, sectionTints, spacing } from "@/lib/theme";

const PRIORITY_COLORS: Record<TodoPriority, string> = {
  urgent: colors.danger,
  soon: colors.gold,
  whenever: colors.textFaint,
};
const PRIORITY_ICONS: Record<TodoPriority, keyof typeof Ionicons.glyphMap> = {
  urgent: "alert-circle",
  soon: "time",
  whenever: "ellipse-outline",
};

export type TodoCategorySelection = { priority: TodoPriority; categoryId: string | null };

type Props = {
  value: TodoCategorySelection;
  onChange: (next: TodoCategorySelection) => void;
};

export function TodoCategoryPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { categories, addCategory } = useTodoCategories();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<keyof typeof Ionicons.glyphMap>(TODO_CATEGORY_ICONS[0]);
  const [isSaving, setIsSaving] = useState(false);

  function openCreate() {
    setNewName("");
    setNewIcon(TODO_CATEGORY_ICONS[0]);
    setIsCreating(true);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsSaving(true);
    const { error, category } = await addCategory(newName.trim(), newIcon);
    setIsSaving(false);
    if (error || !category) return;
    onChange({ priority: "whenever", categoryId: category.id });
    setIsCreating(false);
  }

  return (
    <View>
      <View style={styles.chipRow}>
        {(["urgent", "soon", "whenever"] as TodoPriority[]).map((p) => (
          <Chip
            key={p}
            label={t(`common.priority.${p}`)}
            icon={PRIORITY_ICONS[p]}
            selected={value.categoryId === null && value.priority === p}
            onPress={() => onChange({ priority: p, categoryId: null })}
            color={PRIORITY_COLORS[p]}
          />
        ))}
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            icon={c.icon}
            selected={value.categoryId === c.id}
            onPress={() => onChange({ priority: "whenever", categoryId: c.id })}
            color={sectionColors.todo}
          />
        ))}
        <TouchableOpacity style={styles.newButton} onPress={openCreate}>
          <Ionicons name="add" size={14} color={sectionColors.todo} />
          <Text style={styles.newButtonText}>{t("todo.newCategory")}</Text>
        </TouchableOpacity>
      </View>

      <BottomSheetModal visible={isCreating} onClose={() => setIsCreating(false)}>
        <ModalTitle icon="pricetag" tint={sectionColors.todo} tintBackground={sectionTints.todo} title={t("todo.newCategory")} />
        <TextField placeholder={t("todo.categoryNamePlaceholder")} value={newName} onChangeText={setNewName} autoFocus />
        <View style={styles.iconGrid}>
          {TODO_CATEGORY_ICONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[styles.iconOption, newIcon === icon && styles.iconOptionSelected]}
              onPress={() => setNewIcon(icon)}
            >
              <Ionicons name={icon} size={20} color={newIcon === icon ? colors.white : colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
        <Button
          label={t("todo.createCategory")}
          onPress={handleCreate}
          loading={isSaving}
          style={[styles.submitButton, { backgroundColor: sectionColors.todo }]}
        />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: sectionColors.todo,
  },
  newButtonText: { fontSize: 13, fontWeight: "700", color: sectionColors.todo },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionSelected: { backgroundColor: sectionColors.todo },
  submitButton: { marginTop: spacing.md },
});
