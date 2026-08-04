import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTodos, type TodoPriority } from "@/hooks/useTodos";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useProfile } from "@/hooks/useProfile";
import { getMemberColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import type { TodoReminder } from "@/lib/reminders";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FieldLabel } from "@/components/FieldLabel";
import { TodoReminderPicker } from "@/components/TodoReminderPicker";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  urgent: "Urgent",
  soon: "Better sooner",
  whenever: "Whenever",
};

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

export default function TodoDetailScreen() {
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
  const [details, setDetails] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [reminder, setReminder] = useState<TodoReminder | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!todo) return;
    setTitle(todo.title);
    setAssignedTo(todo.assigned_to);
    setPriority(todo.priority);
    setDetails(todo.description ?? "");
    setIsPrivate(todo.is_private);
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
      description: details.trim() || null,
      isPrivate,
      reminder,
    });
    setIsSaving(false);
    router.back();
  }

  function handleDelete() {
    if (!todo) return;
    Alert.alert("Delete task?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
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
          <Text style={styles.headerTitle}>Task</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Task not found</Text>
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
        <Text style={styles.headerTitle}>Edit Task</Text>
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
            {todo.is_complete ? "Mark as Not Done" : "Mark as Done"}
          </Text>
        </TouchableOpacity>

        <FieldLabel icon="create-outline" label="Title" />
        <TextField placeholder="Task title" value={title} onChangeText={setTitle} />
        <Text style={styles.creatorText}>Added by {isCreator ? "you" : creator?.full_name ?? "a family member"}</Text>

        <FieldLabel icon="flag-outline" label="Priority" />
        <View style={styles.chipRow}>
          {(["urgent", "soon", "whenever"] as TodoPriority[]).map((p) => (
            <Chip
              key={p}
              label={PRIORITY_LABELS[p]}
              icon={PRIORITY_ICONS[p]}
              selected={priority === p}
              onPress={() => setPriority(p)}
              color={PRIORITY_COLORS[p]}
            />
          ))}
        </View>

        <FieldLabel icon="people-outline" label="Assign to" />
        <View style={styles.chipRow}>
          <Chip label="Unassigned" selected={assignedTo === null} onPress={() => setAssignedTo(null)} color={NEUTRAL_COLOR} />
          {members.map((m) => (
            <Chip
              key={m.id}
              label={m.full_name ?? "Member"}
              selected={assignedTo === m.id}
              onPress={() => setAssignedTo(m.id)}
              color={getMemberColor(m)}
            />
          ))}
        </View>

        {isCreator && (
          <View style={styles.switchRow}>
            <FieldLabel icon="lock-closed-outline" label="Keep it private" />
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: sectionColors.todo }}
            />
          </View>
        )}

        <TodoReminderPicker value={reminder} onChange={setReminder} tint={sectionColors.todo} />

        <FieldLabel icon="document-text-outline" label="More details" />
        <TextField
          placeholder="Notes, sub-steps, etc."
          value={details}
          onChangeText={setDetails}
          multiline
          style={styles.detailsInput}
        />

        <Button label="Save" onPress={handleSave} loading={isSaving} style={styles.saveButton} />
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
