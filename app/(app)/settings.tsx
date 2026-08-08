import { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useFamily } from "@/hooks/useFamily";
import { useMyFamilies } from "@/hooks/useMyFamilies";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { setAppLanguage, type AppLanguage } from "@/lib/i18n";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { cardShadow, colors, gradients, radii, spacing } from "@/lib/theme";

type NotificationKey = "messages" | "calendar" | "todos" | "urgentTodos" | "groceries";

const NOTIFICATION_ITEMS: { key: NotificationKey; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "messages", labelKey: "settings.notif.messages", icon: "chatbubble-ellipses" },
  { key: "calendar", labelKey: "settings.notif.calendar", icon: "calendar" },
  { key: "todos", labelKey: "settings.notif.todos", icon: "checkmark-circle" },
  { key: "urgentTodos", labelKey: "settings.notif.urgentTodos", icon: "alert-circle" },
  { key: "groceries", labelKey: "settings.notif.groceries", icon: "cart" },
];

const DEFAULT_HOME_SECTIONS = ["messages", "whatsnew", "today", "urgent_todos", "todays_meals"];

const HOME_SECTION_ITEMS: { key: string; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "messages", labelKey: "home.sections.messages", icon: "chatbubble-ellipses" },
  { key: "whatsnew", labelKey: "home.sections.whatsNew", icon: "sparkles" },
  { key: "today", labelKey: "home.sections.today", icon: "calendar" },
  { key: "urgent_todos", labelKey: "home.sections.urgentTodo", icon: "alert-circle" },
  { key: "todays_meals", labelKey: "home.sections.todaysMeals", icon: "restaurant" },
];

const DEFAULT_NOTIFICATION_PREFS: Record<NotificationKey, boolean> = {
  messages: true,
  calendar: true,
  todos: true,
  urgentTodos: true,
  groceries: true,
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { profile, refetch, updateHomeSections, updateNotificationPrefs } = useProfile();
  const { family, updateFamily } = useFamily();
  const { families, switchFamily } = useMyFamilies();
  const { members, promoteToAdmin, removeMember, addManagedMember, renameMember } = useFamilyMembers();
  const visibleSections = profile?.home_visible_sections ?? DEFAULT_HOME_SECTIONS;
  const notificationPrefs = profile?.notification_prefs ?? DEFAULT_NOTIFICATION_PREFS;
  const myRole = members.find((m) => m.id === profile?.id)?.role;
  const isAdmin = myRole === "admin";

  const [isAddingManaged, setIsAddingManaged] = useState(false);
  const [managedNameDraft, setManagedNameDraft] = useState("");
  const [isAddingManagedSaving, setIsAddingManagedSaving] = useState(false);
  const [renamingMemberId, setRenamingMemberId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenamingFamily, setIsRenamingFamily] = useState(false);
  const [familyNameDraft, setFamilyNameDraft] = useState("");

  function toggleHomeSection(key: string) {
    const next = visibleSections.includes(key)
      ? visibleSections.filter((k) => k !== key)
      : [...visibleSections, key];
    updateHomeSections(next);
  }

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.full_name ?? "");
  const [isSaving, setIsSaving] = useState(false);

  function toggleNotification(key: NotificationKey) {
    updateNotificationPrefs({ ...notificationPrefs, [key]: !notificationPrefs[key] });
  }

  function openEditName() {
    setNameDraft(profile?.full_name ?? "");
    setIsEditingName(true);
  }

  async function handleSaveName() {
    if (!profile || !nameDraft.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: nameDraft.trim() }).eq("id", profile.id);
    setIsSaving(false);
    if (error) {
      Alert.alert(t("settings.couldntUpdateName"), error.message);
      return;
    }
    await refetch();
    setIsEditingName(false);
  }

  async function handleShareInvite() {
    if (!family) return;
    await Share.share({
      message: t("settings.shareInviteMessage", { code: family.invite_code, name: family.name }),
    });
  }

  async function handleSwitchFamily(familyId: string) {
    if (familyId === family?.id) return;
    const result = await switchFamily(familyId);
    if (result.error) {
      Alert.alert(t("settings.couldntSwitchFamily"), result.error);
    }
  }

  function openRenameFamily() {
    setFamilyNameDraft(family?.name ?? "");
    setIsRenamingFamily(true);
  }

  async function handleRenameFamily() {
    if (!familyNameDraft.trim()) return;
    await updateFamily({ name: familyNameDraft.trim() });
    setIsRenamingFamily(false);
  }

  async function handleAddManagedMember() {
    if (!managedNameDraft.trim()) return;
    setIsAddingManagedSaving(true);
    const result = await addManagedMember(managedNameDraft.trim());
    setIsAddingManagedSaving(false);
    if (result.error) {
      Alert.alert(t("settings.couldntAddMember"), result.error);
      return;
    }
    setManagedNameDraft("");
    setIsAddingManaged(false);
  }

  function openRenameMember(memberId: string, currentName: string | null) {
    setRenamingMemberId(memberId);
    setRenameDraft(currentName ?? "");
  }

  async function handleRenameMember() {
    if (!renamingMemberId || !renameDraft.trim()) return;
    const result = await renameMember(renamingMemberId, renameDraft.trim());
    if (result.error) {
      Alert.alert(t("settings.couldntRenameMember"), result.error);
      return;
    }
    setRenamingMemberId(null);
  }

  async function handlePromote(memberId: string) {
    const result = await promoteToAdmin(memberId);
    if (result.error) Alert.alert(t("settings.couldntPromoteMember"), result.error);
  }

  function handleRemoveMember(memberId: string, name: string | null) {
    Alert.alert(t("settings.removeMemberTitle"), t("settings.removeMemberMessage", { name: name ?? t("settings.thisMember") }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: async () => {
          const result = await removeMember(memberId);
          if (result.error) Alert.alert(t("settings.couldntRemoveMember"), result.error);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={gradients.primary}
          style={styles.profileCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={openEditName} style={styles.flexShrink}>
            <Text style={styles.profileName}>{profile?.full_name ?? t("common.youCapitalized")}</Text>
            <Text style={styles.profileEdit}>{t("settings.tapToEditName")}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionLabel}>{t("settings.language")}</Text>
        <View style={[styles.tintCard, styles.tintPurple, styles.languageRow]}>
          {(["en", "fr"] as AppLanguage[]).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.languageOption, i18n.language === lang && styles.languageOptionSelected]}
              onPress={() => setAppLanguage(lang)}
            >
              <Text style={[styles.languageOptionText, i18n.language === lang && styles.languageOptionTextSelected]}>
                {lang === "en" ? "🇬🇧 English" : "🇫🇷 Français"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t("settings.family")}</Text>
        <View style={[styles.tintCard, styles.tintPurple]}>
          {families.map((f) => (
            <TouchableOpacity key={f.id} style={styles.listRow} onPress={() => handleSwitchFamily(f.id)}>
              <View style={styles.iconChip}>
                <Ionicons name="people" size={16} color={colors.purple} />
              </View>
              <Text style={styles.rowLabel}>{f.name}</Text>
              {f.id === family?.id && isAdmin && (
                <TouchableOpacity onPress={openRenameFamily} hitSlop={8}>
                  <Ionicons name="pencil" size={16} color={colors.purple} />
                </TouchableOpacity>
              )}
              {f.id === family?.id && <Ionicons name="checkmark-circle" size={18} color={colors.purple} />}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.listRow} onPress={handleShareInvite}>
            <View style={styles.iconChip}>
              <Ionicons name="person-add" size={16} color={colors.purple} />
            </View>
            <Text style={styles.rowLabel}>{t("settings.inviteMember")}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(31,41,55,0.35)" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.listRow, styles.rowLast]}
            onPress={() => router.push("/join-family")}
          >
            <View style={styles.iconChip}>
              <Ionicons name="add-circle" size={16} color={colors.purple} />
            </View>
            <Text style={styles.rowLabel}>{t("settings.joinNewFamily")}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(31,41,55,0.35)" />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={gradients.gold} style={styles.inviteCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.inviteLabel}>{t("settings.inviteCode")}</Text>
          <Text style={styles.inviteCode}>{family?.invite_code ?? "……"}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareInvite}>
            <Text style={styles.shareButtonText}>{t("settings.shareInviteCode")}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionLabel}>{t("settings.familyMembers")}</Text>
        <View style={[styles.tintCard, styles.tintPurple]}>
          {members.map((m, index) => {
            const isSelf = m.id === profile?.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.listRow, index === members.length - 1 && !isAdmin && styles.rowLast]}
                onPress={() => (m.is_managed ? openRenameMember(m.id, m.full_name) : undefined)}
                activeOpacity={m.is_managed ? 0.6 : 1}
              >
                <View style={styles.iconChip}>
                  <Ionicons name={m.is_managed ? "person-circle-outline" : "person"} size={16} color={colors.purple} />
                </View>
                <View style={styles.flexShrink}>
                  <Text style={styles.rowLabel}>
                    {m.full_name ?? t("common.member")}
                    {isSelf ? t("settings.you") : ""}
                  </Text>
                  <Text style={styles.memberSubtext}>
                    {m.role === "admin" ? t("settings.admin") : t("common.member")}
                    {m.is_managed ? t("settings.noPhoneTapToRename") : ""}
                  </Text>
                </View>
                {isAdmin && !isSelf && (
                  <View style={styles.memberActions}>
                    {m.role !== "admin" && (
                      <TouchableOpacity onPress={() => handlePromote(m.id)} hitSlop={8}>
                        <Text style={styles.memberActionLink}>{t("settings.makeAdmin")}</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleRemoveMember(m.id, m.full_name)} hitSlop={8}>
                      <Ionicons name="close-circle" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.listRow, styles.rowLast]} onPress={() => setIsAddingManaged(true)}>
            <View style={styles.iconChip}>
              <Ionicons name="add-circle" size={16} color={colors.purple} />
            </View>
            <Text style={styles.rowLabel}>{t("settings.addMemberNoPhone")}</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(31,41,55,0.35)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>{t("settings.homeSections")}</Text>
        <View style={[styles.tintCard, styles.tintGold]}>
          {HOME_SECTION_ITEMS.map((item, index) => (
            <View
              key={item.key}
              style={[styles.listRow, index === HOME_SECTION_ITEMS.length - 1 && styles.rowLast]}
            >
              <View style={styles.iconChip}>
                <Ionicons name={item.icon} size={16} color={colors.gold} />
              </View>
              <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
              <Switch
                value={visibleSections.includes(item.key)}
                onValueChange={() => toggleHomeSection(item.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t("settings.notifications")}</Text>
        <View style={[styles.tintCard, styles.tintMint]}>
          {NOTIFICATION_ITEMS.map((item, index) => (
            <View
              key={item.key}
              style={[styles.listRow, index === NOTIFICATION_ITEMS.length - 1 && styles.rowLast]}
            >
              <View style={styles.iconChip}>
                <Ionicons name={item.icon} size={16} color={colors.green} />
              </View>
              <Text style={styles.rowLabel}>{t(item.labelKey)}</Text>
              <Switch
                value={notificationPrefs[item.key]}
                onValueChange={() => toggleNotification(item.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          ))}
        </View>

      </ScrollView>

      <BottomSheetModal visible={isEditingName} onClose={() => setIsEditingName(false)}>
        <Text style={styles.modalTitle}>{t("settings.yourName")}</Text>
        <TextField value={nameDraft} onChangeText={setNameDraft} placeholder={t("settings.yourName")} autoFocus />
        <Button label={t("common.save")} onPress={handleSaveName} loading={isSaving} style={styles.saveButton} />
      </BottomSheetModal>

      <BottomSheetModal visible={isRenamingFamily} onClose={() => setIsRenamingFamily(false)}>
        <Text style={styles.modalTitle}>{t("settings.familyName")}</Text>
        <TextField value={familyNameDraft} onChangeText={setFamilyNameDraft} placeholder={t("settings.familyName")} autoFocus />
        <Button label={t("common.save")} onPress={handleRenameFamily} style={styles.saveButton} />
      </BottomSheetModal>

      <BottomSheetModal visible={isAddingManaged} onClose={() => setIsAddingManaged(false)}>
        <Text style={styles.modalTitle}>{t("settings.addMemberNoPhone")}</Text>
        <TextField value={managedNameDraft} onChangeText={setManagedNameDraft} placeholder={t("settings.theirNamePlaceholder")} autoFocus />
        <Button
          label={t("common.add")}
          onPress={handleAddManagedMember}
          loading={isAddingManagedSaving}
          style={styles.saveButton}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={!!renamingMemberId} onClose={() => setRenamingMemberId(null)}>
        <Text style={styles.modalTitle}>{t("settings.renameMember")}</Text>
        <TextField value={renameDraft} onChangeText={setRenameDraft} placeholder={t("settings.namePlaceholder")} autoFocus />
        <Button label={t("common.save")} onPress={handleRenameMember} style={styles.saveButton} />
      </BottomSheetModal>
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  headerSpacer: { width: 24 },
  content: { padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: 40 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...cardShadow,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: colors.white },
  flexShrink: { flexShrink: 1 },
  profileName: { fontSize: 18, fontWeight: "800", color: colors.white },
  profileEdit: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  tintCard: { borderRadius: radii.xl, overflow: "hidden" },
  tintPurple: { backgroundColor: colors.purpleTint },
  tintMint: { backgroundColor: colors.greenTint },
  tintGold: { backgroundColor: colors.goldTint },
  languageRow: { flexDirection: "row", padding: spacing.xs },
  languageOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  languageOptionSelected: { backgroundColor: colors.white },
  languageOptionText: { fontSize: 15, fontWeight: "700", color: colors.textMuted },
  languageOptionTextSelected: { color: colors.purple },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.6)",
  },
  rowLast: { borderBottomWidth: 0 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  memberSubtext: { fontSize: 12, fontWeight: "600", color: "rgba(31,41,55,0.55)", marginTop: 1 },
  memberActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  memberActionLink: { fontSize: 12, fontWeight: "700", color: colors.purple },
  inviteCard: { borderRadius: radii.xl, padding: spacing.lg, marginTop: spacing.md },
  inviteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inviteCode: { fontSize: 28, fontWeight: "800", letterSpacing: 4, color: colors.white, marginTop: 4 },
  shareButton: {
    marginTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  shareButtonText: { color: "#C2410C", fontSize: 14, fontWeight: "800" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  saveButton: { marginTop: spacing.sm },
});
