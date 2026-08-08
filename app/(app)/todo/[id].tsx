import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { useTodos, type TodoPriority } from "@/hooks/useTodos";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useProfile } from "@/hooks/useProfile";
import { getMemberColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import { toDateKey, dateKeyToDate, formatDate } from "@/lib/dateUtils";
import type { TodoReminder } from "@/lib/reminders";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FieldLabel } from "@/components/FieldLabel";
import { TodoReminderPicker } from "@/components/TodoReminderPicker";
import { TodoCategoryPicker } from "@/components/TodoCategoryPicker";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

export default function TodoDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todos, updateTodo, deleteTodo, toggleTodo } = useTodos();
  const { members } = useFamilyMembers();
  const { profile } = useProfile();

  const todo = todos.find((t) => t.id === id);
  const isCreator = !!todo && todo.created_by === profile?.id;
  const creator = todo ? members.find((m) => m.id === todo.created_by) : undefined;

  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [priority, setPriority] = useState<TodoPriority>("whenever");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [reminder, setReminder] = useState<TodoReminder | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!todo) return;
    setTitle(todo.title);
    setAssignedTo(todo.assigned_to);
    setPriority(todo.priority);
    setCategoryId(todo.category_id);
    setDetails(todo.description ?? "");
    setIsPrivate(todo.is_private);
    setDueDate(todo.due_date ? dateKeyToDate(todo.due_date) : null);
    setReminder(
      todo.reminder_enabled && todo.reminder_freq && todo.reminder_time
        ? { freq: todo.reminder_freq, time: todo.reminder_time, weekday: todo.reminder_weekday }
        : null
    );
  }, [todo?.id]);

  async function handleSave() {
    if (!todo || !title.trim()) return;
    setIsSaving(true);
    await updateTodo(todo.id, {
      title: title.trim(),
      assignedTo,
      priority,
      categoryId,
      dueDate: dueDate ? toDateKey(dueDate) : null,
      description: details.trim() || null,
      isPrivate,
      reminder,
    });
    setIsSaving(false);
    router.back();
  }

  function handleDelete() {
    if (!todo) return;
    Alert.alert(t("todo.deleteTaskTitle"), t("common.thisCantBeUndone"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          deleteTodo(todo.id);
          router.back();
        },
      },
    ]);
  }

  if (!todo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("todo.task")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>{t("todo.taskNotFound")}</Text>
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
        <Text style={styles.headerTitle}>{t("todo.editTask")}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={[styles.markDoneButton, todo.is_complete && styles.markDoneButtonDone]}
          onPress={() => toggleTodo(todo)}
        >
          <Ionicons
            name={todo.is_complete ? "refresh" : "checkmark-circle"}
            size={18}
            color={todo.is_complete ? colors.textMuted : colors.white}
          />
          <Text style={[styles.markDoneText, todo.is_complete && styles.markDoneTextDone]}>
            {todo.is_complete ? t("todo.markAsNotDone") : t("todo.markAsDone")}
          </Text>
        </TouchableOpacity>

        <FieldLabel icon="create-outline" label={t("common.title")} />
        <TextField placeholder={t("todo.taskTitlePlaceholder")} value={title} onChangeText={setTitle} />
        <Text style={styles.creatorText}>
          {t("common.addedBy", { name: isCreator ? t("common.you") : creator?.full_name ?? t("common.aFamilyMember") })}
        </Text>

        <FieldLabel icon="flag-outline" label={t("todo.category")} />
        <TodoCategoryPicker
          value={{ priority, categoryId }}
          onChange={(next) => {
            setPriority(next.priority);
            setCategoryId(next.categoryId);
          }}
        />

        <FieldLabel icon="people-outline" label={t("common.assignTo")} />
        <View style={styles.chipRow}>
          <Chip label={t("common.unassigned")} selected={assignedTo === null} onPress={() => setAssignedTo(null)} color={NEUTRAL_COLOR} />
          {members.map((m) => (
            <Chip
              key={m.id}
              label={m.full_name ?? t("common.member")}
              selected={assignedTo === m.id}
              onPress={() => setAssignedTo(m.id)}
              color={getMemberColor(m)}
            />
          ))}
        </View>

        {isCreator && (
          <View style={styles.switchRow}>
            <FieldLabel icon="lock-closed-outline" label={t("common.keepItPrivate")} />
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: sectionColors.todo }}
            />
          </View>
        )}

        <FieldLabel icon="calendar-outline" label={t("todo.dueDateOptional")} />
        <View style={styles.dueDateRow}>
          <TouchableOpacity style={styles.dueDateButton} onPress={() => setShowDueDatePicker(true)}>
            <Ionicons name="calendar-outline" size={15} color={sectionColors.todo} />
            <Text style={styles.dueDateButtonText}>{dueDate ? formatDate(dueDate) : t("todo.addDueDate")}</Text>
          </TouchableOpacity>
          {dueDate && (
            <TouchableOpacity onPress={() => setDueDate(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
        {showDueDatePicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="default"
            onChange={(_, selected) => {
              setShowDueDatePicker(false);
              if (selected) setDueDate(selected);
            }}
          />
        )}

        <TodoReminderPicker value={reminder} onChange={setReminder} tint={sectionColors.todo} />

        <FieldLabel icon="document-text-outline" label={t("common.moreDetails")} />
        <TextField
          placeholder={t("todo.detailsPlaceholder")}
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
  creatorText: { fontSize: 12, color: colors.textFaint },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  detailsInput: { minHeight: 90, textAlignVertical: "top" },
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dueDateButton: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  dueDateButtonText: { fontSize: 15, fontWeight: "600", color: colors.text },
  saveButton: { marginTop: spacing.lg, backgroundColor: sectionColors.todo },
  emptyText: { color: colors.textMuted },
  markDoneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: sectionColors.todo,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  markDoneButtonDone: { backgroundColor: colors.surface },
  markDoneText: { fontSize: 15, fontWeight: "700", color: colors.white },
  markDoneTextDone: { color: colors.textMuted },
});
