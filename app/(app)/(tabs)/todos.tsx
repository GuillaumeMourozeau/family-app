import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { useTodos, type Todo, type TodoPriority } from "@/hooks/useTodos";
import { useTodoCategories, type TodoCategory } from "@/hooks/useTodoCategories";
import { useFamilyMembers, type FamilyMember } from "@/hooks/useFamilyMembers";
import { useProfile } from "@/hooks/useProfile";
import { useCollapsedSections } from "@/hooks/useCollapsedSections";
import { getMemberColor, getTodoAssigneeColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import { isNewItem } from "@/lib/newBadge";
import { toDateKey, dateKeyToDate, isToday, formatDate } from "@/lib/dateUtils";
import type { TodoReminder } from "@/lib/reminders";
import { TabScreenHeader } from "@/components/TabScreenHeader";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { TodoReminderPicker } from "@/components/TodoReminderPicker";
import { TodoCategoryPicker } from "@/components/TodoCategoryPicker";
import { ReorderableList } from "@/components/ReorderableList";
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

const PRIORITY_ORDER: TodoPriority[] = ["urgent", "soon", "whenever"];
const UNASSIGNED_FILTER = "unassigned";

export default function TodosScreen() {
  const { t } = useTranslation();
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo } = useTodos();
  const { categories, reorderCategories } = useTodoCategories();
  const { members } = useFamilyMembers();
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedSections("todos");
  const [isReordering, setIsReordering] = useState(false);
  const [reorderScrollEnabled, setReorderScrollEnabled] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [priority, setPriority] = useState<TodoPriority>("whenever");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [reminder, setReminder] = useState<TodoReminder | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const filteredTodos = useMemo(() => {
    if (memberFilter === UNASSIGNED_FILTER) return todos.filter((t) => t.assigned_to === null);
    if (memberFilter) return todos.filter((t) => t.assigned_to === memberFilter);
    return todos;
  }, [todos, memberFilter]);

  const { byPriority, byCategory } = useMemo(() => {
    const byPriority = new Map<TodoPriority, Todo[]>();
    const byCategory = new Map<string, Todo[]>();
    for (const todo of filteredTodos) {
      if (todo.category_id) {
        const list = byCategory.get(todo.category_id) ?? [];
        list.push(todo);
        byCategory.set(todo.category_id, list);
      } else {
        const list = byPriority.get(todo.priority) ?? [];
        list.push(todo);
        byPriority.set(todo.priority, list);
      }
    }
    return { byPriority, byCategory };
  }, [filteredTodos]);

  async function handleAddTodo() {
    if (!title.trim()) return;
    await addTodo(title.trim(), assignedTo, priority, isPrivate, reminder, categoryId, dueDate ? toDateKey(dueDate) : null);
    setTitle("");
    setAssignedTo(null);
    setPriority("whenever");
    setCategoryId(null);
    setIsPrivate(false);
    setReminder(null);
    setDueDate(null);
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
        title={t("todo.tabTitle")}
        icon="checkmark-circle"
        tint={sectionColors.todo}
        tintBackground={sectionTints.todo}
        actionLabel={t("todo.addTodoAction")}
        onAction={() => setIsAdding(true)}
        onIconPress={() => router.push("/todo-settings")}
      />

      <View style={styles.filterRow}>
        <Chip
          label={t("common.everyone")}
          selected={memberFilter === null}
          onPress={() => setMemberFilter(null)}
          color={NEUTRAL_COLOR}
        />
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.full_name ?? t("common.member")}
            selected={memberFilter === m.id}
            onPress={() => setMemberFilter(m.id)}
            color={getMemberColor(m)}
          />
        ))}
        <Chip
          label={t("common.unassigned")}
          selected={memberFilter === UNASSIGNED_FILTER}
          onPress={() => setMemberFilter(UNASSIGNED_FILTER)}
          color={NEUTRAL_COLOR}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredTodos.length === 0 ? (
          <Text style={styles.emptyText}>{t("todo.noTasksYet")}</Text>
        ) : (
          <>
            {PRIORITY_ORDER.map((p) => {
              const items = byPriority.get(p) ?? [];
              if (items.length === 0) return null;
              const sectionKey = `priority:${p}`;
              const collapsed = isCollapsed(sectionKey);
              return (
                <View key={p} style={styles.section}>
                  <TouchableOpacity style={styles.sectionTitleRow} onPress={() => toggleCollapsed(sectionKey)}>
                    <Ionicons name={collapsed ? "chevron-forward" : "chevron-down"} size={14} color={colors.textFaint} />
                    <Ionicons name={PRIORITY_ICONS[p]} size={20} color={PRIORITY_COLORS[p]} />
                    <Text style={[styles.sectionTitle, { color: PRIORITY_COLORS[p] }]}>{t(`common.priority.${p}`)}</Text>
                  </TouchableOpacity>
                  {!collapsed &&
                    items.map((todo) => (
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
            })}
            {categories.map((cat) => {
              const items = byCategory.get(cat.id) ?? [];
              if (items.length === 0) return null;
              const collapsed = isCollapsed(cat.id);
              return (
                <View key={cat.id} style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionTitleRow}
                    onPress={() => toggleCollapsed(cat.id)}
                    onLongPress={() => setIsReordering(true)}
                  >
                    <Ionicons name={collapsed ? "chevron-forward" : "chevron-down"} size={14} color={colors.textFaint} />
                    <Ionicons name={cat.icon} size={20} color={sectionColors.todo} />
                    <Text style={[styles.sectionTitle, { color: sectionColors.todo }]}>{cat.name}</Text>
                  </TouchableOpacity>
                  {!collapsed &&
                    items.map((todo) => (
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
            })}
          </>
        )}
      </ScrollView>

      <BottomSheetModal visible={isAdding} onClose={() => setIsAdding(false)}>
        <ModalTitle icon="checkmark-circle" tint={sectionColors.todo} tintBackground={sectionTints.todo} title={t("todo.newTask")} />
        <TextField placeholder={t("todo.taskTitlePlaceholder")} value={title} onChangeText={setTitle} autoFocus />

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

        <View style={styles.switchRow}>
          <FieldLabel icon="lock-closed-outline" label={t("common.keepItPrivate")} />
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: colors.border, true: sectionColors.todo }} />
        </View>

        <Button label={t("todo.addTask")} onPress={handleAddTodo} style={styles.submitButton} />
      </BottomSheetModal>

      <BottomSheetModal
        visible={isReordering}
        onClose={() => setIsReordering(false)}
        scrollEnabled={reorderScrollEnabled}
      >
        <ModalTitle
          icon="swap-vertical"
          tint={sectionColors.todo}
          tintBackground={sectionTints.todo}
          title={t("todo.reorderCategories")}
        />
        <Text style={styles.reorderHint}>{t("todo.reorderHint")}</Text>
        <ReorderableList
          data={[...categories].sort((a, b) => a.sort_order - b.sort_order)}
          keyExtractor={(c) => c.id}
          rowHeight={52}
          onReorderStart={() => setReorderScrollEnabled(false)}
          onReorderEnd={(newOrder) => {
            setReorderScrollEnabled(true);
            reorderCategories(newOrder.map((c) => c.id));
          }}
          renderRow={(cat: TodoCategory, isActive) => (
            <View style={[styles.reorderRow, isActive && styles.reorderRowActive]}>
              <Ionicons name={cat.icon} size={18} color={sectionColors.todo} />
              <Text style={styles.reorderRowText}>{cat.name}</Text>
              <Ionicons name="reorder-three" size={20} color={colors.textFaint} />
            </View>
          )}
        />
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
  const { t } = useTranslation();
  const { profile } = useProfile();
  const assignee = members.find((m) => m.id === todo.assigned_to);
  const metaParts = [assignee?.full_name].filter(Boolean);
  const dueDate = todo.due_date ? dateKeyToDate(todo.due_date) : null;
  const isOverdue = !!dueDate && !todo.is_complete && !isToday(dueDate) && dueDate < new Date();

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
            {isNewItem(todo.created_at, todo.created_by, profile) && <Text style={styles.newBadge}>{t("common.new")}</Text>}
          </View>
          <View style={styles.metaRow}>
            <View style={[styles.assigneeDot, { backgroundColor: getTodoAssigneeColor(todo.assigned_to, members) }]} />
            {metaParts.length > 0 && <Text style={styles.rowMeta}>{metaParts.join(" · ")}</Text>}
            {dueDate && (
              <Text style={[styles.rowMeta, isOverdue && styles.rowMetaOverdue]}>
                {metaParts.length > 0 ? " · " : ""}
                {t("todo.due", { date: formatDate(dueDate, { month: "short", day: "numeric" }) })}
              </Text>
            )}
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
  reorderHint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 52,
    backgroundColor: colors.white,
  },
  reorderRowActive: { backgroundColor: sectionTints.todo, borderRadius: radii.md },
  reorderRowText: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
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
  rowMetaOverdue: { color: colors.danger, fontWeight: "700" },
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
