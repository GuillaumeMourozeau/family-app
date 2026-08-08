import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useProfile } from "@/hooks/useProfile";
import { useFamily } from "@/hooks/useFamily";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useEvents } from "@/hooks/useEvents";
import { useTodos } from "@/hooks/useTodos";
import { useGroceries } from "@/hooks/useGroceries";
import { useMessages } from "@/hooks/useMessages";
import { useMealPlan } from "@/hooks/useMealPlan";
import { MEAL_TYPE_ORDER, MEAL_TYPE_ICONS } from "@/lib/mealTypes";
import { formatTime } from "@/lib/dateUtils";
import { TextField } from "@/components/TextField";
import { cardShadow, colors, gradients, radii, sectionColors, sectionTints, spacing } from "@/lib/theme";
import { expandOccurrences } from "@/lib/recurrence";

const MESSAGE_MAX_LENGTH = 30;

type ActivityKind = "event" | "todo" | "grocery";
type ActivityItem = {
  kind: ActivityKind;
  id: string;
  title: string;
  createdAt: string;
  createdBy: string;
};

const ACTIVITY_META: Record<
  ActivityKind,
  { icon: keyof typeof Ionicons.glyphMap; color: string; tint: string; labelKey: string; route: string }
> = {
  event: { icon: "calendar", color: sectionColors.calendar, tint: sectionTints.calendar, labelKey: "common.category.calendar", route: "/event" },
  todo: { icon: "checkmark-circle", color: sectionColors.todo, tint: sectionTints.todo, labelKey: "common.category.todo", route: "/todo" },
  grocery: { icon: "cart", color: sectionColors.groceries, tint: sectionTints.groceries, labelKey: "common.category.groceries", route: "/grocery" },
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { profile, markActivitySeen } = useProfile();
  const { family } = useFamily();
  const { members } = useFamilyMembers();
  const { events } = useEvents();
  const { todos, toggleTodo } = useTodos();
  const { items: groceryItems } = useGroceries();
  const { messages, postMessage, deleteMessage } = useMessages();
  const { entries: mealEntries } = useMealPlan();

  const [messageDraft, setMessageDraft] = useState("");
  const isAdmin = members.find((m) => m.id === profile?.id)?.role === "admin";

  const visibleSections =
    profile?.home_visible_sections ?? ["messages", "whatsnew", "today", "urgent_todos", "todays_meals"];

  const todaysEventOccurrences = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return expandOccurrences(events, dayStart, dayEnd);
  }, [events]);

  const urgentTodos = useMemo(() => todos.filter((t) => t.priority === "urgent"), [todos]);

  const todaysMeals = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return mealEntries
      .filter((m) => m.date === todayKey)
      .sort((a, b) => MEAL_TYPE_ORDER[a.meal_type] - MEAL_TYPE_ORDER[b.meal_type]);
  }, [mealEntries]);

  const activityItems = useMemo(() => {
    if (!profile) return [];
    const since = new Date(profile.last_seen_activity_at);
    const items: ActivityItem[] = [];
    for (const e of events) {
      if (e.created_by !== profile.id && new Date(e.created_at) > since) {
        items.push({ kind: "event", id: e.id, title: e.title, createdAt: e.created_at, createdBy: e.created_by });
      }
    }
    for (const t of todos) {
      if (t.created_by !== profile.id && new Date(t.created_at) > since) {
        items.push({ kind: "todo", id: t.id, title: t.title, createdAt: t.created_at, createdBy: t.created_by });
      }
    }
    for (const g of groceryItems) {
      if (g.created_by !== profile.id && new Date(g.created_at) > since) {
        items.push({ kind: "grocery", id: g.id, title: g.name, createdAt: g.created_at, createdBy: g.created_by });
      }
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [profile, events, todos, groceryItems]);

  async function handlePostMessage() {
    if (!messageDraft.trim()) return;
    await postMessage(messageDraft.trim());
    setMessageDraft("");
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.primary} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.topRow}>
          <Text style={styles.familyName}>{family?.name ?? t("home.yourFamily")}</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push("/settings")}>
            <Ionicons name="settings-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtext}>
          {t("home.greeting", { name: profile?.full_name || t("home.thereDefaultName") })}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {visibleSections.includes("messages") && (
          <>
            <SectionTitle icon="chatbubble-ellipses" tint={sectionColors.home} tintBg={colors.primaryMuted} label={t("home.sections.messages")} />
            <View style={styles.card}>
              <View style={styles.messageInputRow}>
                <TextField
                  style={styles.messageInput}
                  placeholder={t("home.messagePlaceholder")}
                  value={messageDraft}
                  onChangeText={setMessageDraft}
                  maxLength={MESSAGE_MAX_LENGTH}
                  onSubmitEditing={handlePostMessage}
                />
                <TouchableOpacity style={styles.postButton} onPress={handlePostMessage}>
                  <Ionicons name="send" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
              {messages.length === 0 ? (
                <Text style={styles.emptyText}>{t("home.noMessagesYet")}</Text>
              ) : (
                messages.map((m) => {
                  const isMine = m.profile_id === profile?.id;
                  const author = members.find((mem) => mem.id === m.profile_id);
                  return (
                    <View key={m.profile_id} style={styles.messageRow}>
                      <Text style={styles.messageAuthor}>{isMine ? t("common.youCapitalized") : author?.full_name ?? t("common.member")}</Text>
                      <Text style={styles.messageContent} numberOfLines={1}>
                        {m.content}
                      </Text>
                      {(isMine || isAdmin) && (
                        <TouchableOpacity onPress={() => deleteMessage(m.profile_id)} hitSlop={8}>
                          <Text style={styles.clearMessageLink}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {visibleSections.includes("whatsnew") && (
          <>
            <SectionTitle
              icon="sparkles"
              tint={colors.blue}
              tintBg={colors.blueTint}
              label={t("home.sections.whatsNew")}
              action={activityItems.length > 0 ? { label: t("common.clear"), onPress: markActivitySeen } : undefined}
            />
            <View style={styles.card}>
              {activityItems.length === 0 ? (
                <Text style={styles.emptyText}>{t("home.nothingNewSinceLastChecked")}</Text>
              ) : (
                activityItems.map((item, index) => {
                  const meta = ACTIVITY_META[item.kind];
                  const author = members.find((m) => m.id === item.createdBy);
                  return (
                    <TouchableOpacity
                      key={`${item.kind}-${item.id}`}
                      style={[styles.activityRow, index === activityItems.length - 1 && styles.rowLast]}
                      onPress={() => router.push(`${meta.route}/${item.id}` as never)}
                    >
                      <View style={[styles.activityIconBadge, { backgroundColor: meta.tint }]}>
                        <Ionicons name={meta.icon} size={14} color={meta.color} />
                      </View>
                      <View style={styles.flexShrink}>
                        <Text style={styles.rowLabel} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.rowAssignee}>
                          {author?.full_name ?? t("common.member")} · {t(meta.labelKey)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}

        {visibleSections.includes("today") && (
          <>
            <SectionTitle
              icon="calendar"
              tint={sectionColors.calendar}
              tintBg={sectionTints.calendar}
              label={t("home.sections.today")}
              onPress={() => router.push("/calendar")}
            />
            {todaysEventOccurrences.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t("home.noEventsToday")}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hscroll}>
                {todaysEventOccurrences.map((occ) => (
                  <TouchableOpacity
                    key={occ.key}
                    style={styles.eventPill}
                    onPress={() => router.push(`/event/${occ.event.id}`)}
                  >
                    <Text style={styles.eventTime}>
                      {occ.event.all_day ? t("common.allDay") : formatTime(occ.startAt, { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {occ.event.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {visibleSections.includes("urgent_todos") && (
          <>
            <SectionTitle
              icon="alert-circle"
              tint={colors.danger}
              tintBg={colors.dangerTint}
              label={t("home.sections.urgentTodo")}
              onPress={() => router.push("/todos")}
            />
            <View style={styles.card}>
              {urgentTodos.length === 0 ? (
                <Text style={styles.emptyText}>{t("home.nothingUrgentRightNow")}</Text>
              ) : (
                urgentTodos.map((todo, index) => {
                  const assignee = members.find((m) => m.id === todo.assigned_to);
                  return (
                    <View
                      key={todo.id}
                      style={[styles.todoRow, index === urgentTodos.length - 1 && styles.rowLast]}
                    >
                      <TouchableOpacity
                        style={[styles.checkbox, todo.is_complete && styles.checkboxChecked]}
                        onPress={() => toggleTodo(todo)}
                        hitSlop={8}
                      >
                        {todo.is_complete && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.flexShrink} onPress={() => router.push(`/todo/${todo.id}`)}>
                        <Text
                          style={[styles.rowLabel, todo.is_complete && styles.rowLabelDone]}
                          numberOfLines={1}
                        >
                          {todo.title}
                        </Text>
                        {assignee && <Text style={styles.rowAssignee}>{assignee.full_name ?? t("common.member")}</Text>}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        {visibleSections.includes("todays_meals") && (
          <>
            <SectionTitle
              icon="restaurant"
              tint={sectionColors.meals}
              tintBg={sectionTints.meals}
              label={t("home.sections.todaysMeals")}
              onPress={() => router.push("/meals")}
            />
            {todaysMeals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{t("home.noMealsPlannedToday")}</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hscroll}>
                {todaysMeals.map((meal) => (
                  <TouchableOpacity key={meal.id} style={styles.mealPill} onPress={() => router.push("/meals")}>
                    <View style={styles.mealPillHeader}>
                      <Ionicons name={MEAL_TYPE_ICONS[meal.meal_type]} size={12} color={sectionColors.meals} />
                      <Text style={styles.mealPillType}>{t(`common.mealTypes.${meal.meal_type}`)}</Text>
                    </View>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {meal.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionTitle({
  icon,
  tint,
  tintBg,
  label,
  action,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintBg: string;
  label: string;
  action?: { label: string; onPress: () => void };
  onPress?: () => void;
}) {
  const TitleWrapper = onPress ? TouchableOpacity : View;
  return (
    <View style={styles.sectionTitleRow}>
      <TitleWrapper style={styles.sectionTitleLeft} onPress={onPress}>
        <View style={[styles.badge, { backgroundColor: tintBg }]}>
          <Ionicons name={icon} size={14} color={tint} />
        </View>
        <Text style={styles.sectionTitle}>{label}</Text>
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />}
      </TitleWrapper>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={styles.sectionAction}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  banner: {
    paddingTop: 56,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radii.xxl + 6,
    borderBottomRightRadius: radii.xxl + 6,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  familyName: { fontSize: 26, fontWeight: "800", color: colors.white },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtext: { marginTop: spacing.md, fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "500" },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitleLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionAction: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
  badge: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  hscroll: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  eventPill: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    minWidth: 130,
    marginRight: spacing.sm,
    borderTopWidth: 4,
    borderTopColor: sectionColors.calendar,
    ...cardShadow,
  },
  eventTime: { fontSize: 12, fontWeight: "700", color: colors.textFaint },
  eventTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: spacing.xs },
  mealPill: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    minWidth: 130,
    marginRight: spacing.sm,
    borderTopWidth: 4,
    borderTopColor: sectionColors.meals,
    ...cardShadow,
  },
  mealPillHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  mealPillType: { fontSize: 11, fontWeight: "700", color: sectionColors.meals, textTransform: "uppercase" },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    ...cardShadow,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...cardShadow,
  },
  emptyText: { fontSize: 14, color: colors.textFaint },
  messageInputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center", marginBottom: spacing.sm },
  messageInput: { flex: 1 },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  messageAuthor: { fontSize: 13, fontWeight: "700", color: colors.text },
  messageContent: { flex: 1, fontSize: 13, color: colors.textMuted },
  clearMessageLink: { color: colors.textFaint, fontSize: 16, paddingHorizontal: spacing.sm },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  activityIconBadge: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  todoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLast: { borderBottomWidth: 0 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.dangerTint,
    backgroundColor: colors.dangerTint,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.danger, borderColor: colors.danger },
  checkmark: { color: colors.white, fontSize: 12, fontWeight: "700" },
  flexShrink: { flexShrink: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowLabelDone: { textDecorationLine: "line-through", color: colors.textFaint },
  rowAssignee: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
