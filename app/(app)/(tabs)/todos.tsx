import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTodos, type Todo, type TodoPriority } from "@/hooks/useTodos";
import { useFamilyMembers, type FamilyMember } from "@/hooks/useFamilyMembers";
import { useProfile } from "@/hooks/useProfile";
import { getMemberColor, getTodoAssigneeColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import { isNewItem } from "@/lib/newBadge";
import type { TodoReminder } from "@/lib/reminders";
import { TabScreenHeader } from "@/components/TabScreenHeader";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { TodoReminderPicker } from "@/components/TodoReminderPicker";
import { colors, radii, sectionColors, sectionTints, spacing } from "@/lib/theme";

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

const PRIORITY_ORDER: TodoPriority[] = ["urgent", "soon", "whenever"];
const UNASSIGNED_FILTER = "unassigned";

export default function TodosScreen() {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo } = useTodos();
  const { members } = useFamilyMembers();

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [priority, setPriority] = useState<TodoPriority>("whenever");
  const [isPrivate, setIsPrivate] = useState(false);
  const [reminder, setReminder] = useState<TodoReminder | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const filteredTodos = useMemo(() => {
    if (memberFilter === UNASSIGNED_FILTER) return todos.filter((t) => t.assigned_to === null);
    if (memberFilter) return todos.filter((t) => t.assigned_to === memberFilter);
    return todos;
  }, [todos, memberFilter]);

  const grouped = useMemo(() => {
    const byPriority = new Map<TodoPriority, Todo[]>();
    for (const todo of filteredTodos) {
      const list = byPriority.get(todo.priority) ?? [];
      list.push(todo);
      byPriority.set(todo.priority, list);
    }
    return byPriority;
  }, [filteredTodos]);

  async function handleAddTodo() {
    if (!title.trim()) return;
    await addTodo(title.trim(), assignedTo, priority, isPrivate, reminder);
    setTitle("");
    setAssignedTo(null);
    setPriority("whenever");
    setIsPrivate(false);
    setReminder(null);
    setIsAdding(false);
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
        title="To-Do"
        icon="checkmark-circle"
        tint={sectionColors.todo}
        tintBackground={sectionTints.todo}
        actionLabel="+ Add To-Do"
        onAction={() => setIsAdding(true)}
        onIconPress={() => router.push("/todo-settings")}
      />

      <View style={styles.filterRow}>
        <Chip
          label="Everyone"
          selected={memberFilter === null}
          onPress={() => setMemberFilter(null)}
          color={NEUTRAL_COLOR}
        />
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.full_name ?? "Member"}
            selected={memberFilter === m.id}
            onPress={() => setMemberFilter(m.id)}
            color={getMemberColor(m)}
          />
        ))}
        <Chip
          label="Unassigned"
          selected={memberFilter === UNASSIGNED_FILTER}
          onPress={() => setMemberFilter(UNASSIGNED_FILTER)}
          color={NEUTRAL_COLOR}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredTodos.length === 0 ? (
          <Text style={styles.emptyText}>No tasks yet. Tap + Add To-Do to create one.</Text>
        ) : (
          PRIORITY_ORDER.map((p) => {
            const items = grouped.get(p) ?? [];
            if (items.length === 0) return null;
            return (
              <View key={p} style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name={PRIORITY_ICONS[p]} size={20} color={PRIORITY_COLORS[p]} />
                  <Text style={[styles.sectionTitle, { color: PRIORITY_COLORS[p] }]}>{PRIORITY_LABELS[p]}</Text>
                </View>
                {items.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    members={members}
                    onToggle={() => toggleTodo(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomSheetModal visible={isAdding} onClose={() => setIsAdding(false)}>
        <ModalTitle icon="checkmark-circle" tint={sectionColors.todo} tintBackground={sectionTints.todo} title="New task" />
        <TextField placeholder="Task title" value={title} onChangeText={setTitle} autoFocus />

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

        <TodoReminderPicker value={reminder} onChange={setReminder} tint={sectionColors.todo} />

        <View style={styles.switchRow}>
          <FieldLabel icon="lock-closed-outline" label="Keep it private" />
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: colors.border, true: sectionColors.todo }} />
        </View>

        <Button label="Add task" onPress={handleAddTodo} style={styles.submitButton} />
      </BottomSheetModal>
    </View>
  );
}

function TodoRow({
  todo,
  members,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  members: FamilyMember[];
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { profile } = useProfile();
  const assignee = members.find((m) => m.id === todo.assigned_to);
  const metaParts = [assignee?.full_name].filter(Boolean);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.checkbox, todo.is_complete && styles.checkboxChecked]}
        onPress={onToggle}
      >
        {todo.is_complete && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.rowMain} onPress={() => router.push(`/todo/${todo.id}`)}>
        <View style={styles.rowTextContainer}>
          <View style={styles.rowTitleLine}>
            {todo.is_private && <Text style={styles.lockIcon}>🔒</Text>}
            <Text style={[styles.rowTitle, todo.is_complete && styles.rowTitleDone]}>{todo.title}</Text>
            {isNewItem(todo.created_at, todo.created_by, profile) && <Text style={styles.newBadge}>New</Text>}
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.assigneeDot, { backgroundColor: getTodoAssigneeColor(todo.assigned_to, members) }]} />
            {metaParts.length > 0 && <Text style={styles.rowMeta}>{metaParts.join(" · ")}</Text>}
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteLink}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  listContent: { paddingBottom: 40 },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: sectionColors.todo, borderColor: sectionColors.todo },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "700" },
  rowMain: { flex: 1 },
  rowTextContainer: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  lockIcon: { fontSize: 11 },
  rowTitle: { fontSize: 16, color: colors.text },
  rowTitleDone: { textDecorationLine: "line-through", color: colors.textFaint },
  newBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  assigneeDot: { width: 7, height: 7, borderRadius: radii.pill },
  rowMeta: { fontSize: 12, color: colors.textMuted },
  deleteLink: { color: colors.textFaint, fontSize: 16, paddingHorizontal: spacing.sm },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  inlineRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  inlineInput: { flex: 1 },
  smallButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  smallButtonText: { color: colors.white, fontWeight: "600" },
  submitButton: { marginTop: spacing.sm, backgroundColor: sectionColors.todo },
});
