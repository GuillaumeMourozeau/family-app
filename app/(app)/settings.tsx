import { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useFamily } from "@/hooks/useFamily";
import { useMyFamilies } from "@/hooks/useMyFamilies";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { cardShadow, colors, gradients, radii, spacing } from "@/lib/theme";

type NotificationKey = "messages" | "calendar" | "todos" | "urgentTodos" | "groceries";

const NOTIFICATION_ITEMS: { key: NotificationKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "messages", label: "New messages", icon: "chatbubble-ellipses" },
  { key: "calendar", label: "New calendar events", icon: "calendar" },
  { key: "todos", label: "New to-do items", icon: "checkmark-circle" },
  { key: "urgentTodos", label: "New urgent to-do items", icon: "alert-circle" },
  { key: "groceries", label: "New grocery items", icon: "cart" },
];

const DEFAULT_HOME_SECTIONS = ["messages", "whatsnew", "today", "urgent_todos", "todays_meals"];

const HOME_SECTION_ITEMS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "messages", label: "Important Messages", icon: "chatbubble-ellipses" },
  { key: "whatsnew", label: "What's New", icon: "sparkles" },
  { key: "today", label: "Today", icon: "calendar" },
  { key: "urgent_todos", label: "Urgent To-Do", icon: "alert-circle" },
  { key: "todays_meals", label: "Today's Meals", icon: "restaurant" },
];

const DEFAULT_NOTIFICATION_PREFS: Record<NotificationKey, boolean> = {
  messages: true,
  calendar: true,
  todos: true,
  urgentTodos: true,
  groceries: true,
};

export default function SettingsScreen() {
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
      Alert.alert("Couldn't update name", error.message);
      return;
    }
    await refetch();
    setIsEditingName(false);
  }

  async function handleShareInvite() {
    if (!family) return;
    await Share.share({
      message: `Join our family on Family App! Use invite code ${family.invite_code} to join "${family.name}".`,
    });
  }

  async function handleSwitchFamily(familyId: string) {
    if (familyId === family?.id) return;
    const result = await switchFamily(familyId);
    if (result.error) {
      Alert.alert("Couldn't switch family", result.error);
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
      Alert.alert("Couldn't add member", result.error);
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
      Alert.alert("Couldn't rename member", result.error);
      return;
    }
    setRenamingMemberId(null);
  }

  async function handlePromote(memberId: string) {
    const result = await promoteToAdmin(memberId);
    if (result.error) Alert.alert("Couldn't promote member", result.error);
  }

  function handleRemoveMember(memberId: string, name: string | null) {
    Alert.alert("Remove member?", `${name ?? "This member"} will lose access to this family.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const result = await removeMember(memberId);
          if (result.error) Alert.alert("Couldn't remove member", result.error);
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
        <Text style={styles.headerTitle}>Settings</Text>
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
            <Text style={styles.profileName}>{profile?.full_name ?? "You"}</Text>
            <Text style={styles.profileEdit}>Tap to edit your name ›</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionLabel}>Family</Text>
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
            <Text style={styles.rowLabel}>Invite a member</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(31,41,55,0.35)" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.listRow, styles.rowLast]}
            onPress={() => router.push("/join-family")}
          >
            <View style={styles.iconChip}>
              <Ionicons name="add-circle" size={16} color={colors.purple} />
            </View>
            <Text style={styles.rowLabel}>Join a new family</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(31,41,55,0.35)" />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={gradients.gold} style={styles.inviteCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.inviteLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{family?.invite_code ?? "……"}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShareInvite}>
            <Text style={styles.shareButtonText}>Share invite code</Text>
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionLabel}>Family Members</Text>
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
                    {m.full_name ?? "Member"}
                    {isSelf ? " (you)" : ""}
                  </Text>
                  <Text style={styles.memberSubtext}>
                    {m.role === "admin" ? "Admin" : "Member"}
                    {m.is_managed ? " · No phone · tap to rename" : ""}
                  </Text>
                </View>
                {isAdmin && !isSelf && (
                  <View style={styles.memberActions}>
                    {m.role !== "admin" && (
                      <TouchableOpacity onPress={() => handlePromote(m.id)} hitSlop={8}>
                        <Text style={styles.memberActionLink}>Make admin</Text>
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
            <Text style={styles.rowLabel}>Add a member without a phone</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(31,41,55,0.35)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Home Sections</Text>
        <View style={[styles.tintCard, styles.tintGold]}>
          {HOME_SECTION_ITEMS.map((item, index) => (
            <View
              key={item.key}
              style={[styles.listRow, index === HOME_SECTION_ITEMS.length - 1 && styles.rowLast]}
            >
              <View style={styles.iconChip}>
                <Ionicons name={item.icon} size={16} color={colors.gold} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Switch
                value={visibleSections.includes(item.key)}
                onValueChange={() => toggleHomeSection(item.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={[styles.tintCard, styles.tintMint]}>
          {NOTIFICATION_ITEMS.map((item, index) => (
            <View
              key={item.key}
              style={[styles.listRow, index === NOTIFICATION_ITEMS.length - 1 && styles.rowLast]}
            >
              <View style={styles.iconChip}>
                <Ionicons name={item.icon} size={16} color={colors.green} />
              </View>
              <Text style={styles.rowLabel}>{item.label}</Text>
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
        <Text style={styles.modalTitle}>Your name</Text>
        <TextField value={nameDraft} onChangeText={setNameDraft} placeholder="Your name" autoFocus />
        <Button label="Save" onPress={handleSaveName} loading={isSaving} style={styles.saveButton} />
      </BottomSheetModal>

      <BottomSheetModal visible={isRenamingFamily} onClose={() => setIsRenamingFamily(false)}>
        <Text style={styles.modalTitle}>Family name</Text>
        <TextField value={familyNameDraft} onChangeText={setFamilyNameDraft} placeholder="Family name" autoFocus />
        <Button label="Save" onPress={handleRenameFamily} style={styles.saveButton} />
      </BottomSheetModal>

      <BottomSheetModal visible={isAddingManaged} onClose={() => setIsAddingManaged(false)}>
        <Text style={styles.modalTitle}>Add a member without a phone</Text>
        <TextField value={managedNameDraft} onChangeText={setManagedNameDraft} placeholder="Their name" autoFocus />
        <Button
          label="Add"
          onPress={handleAddManagedMember}
          loading={isAddingManagedSaving}
          style={styles.saveButton}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={!!renamingMemberId} onClose={() => setRenamingMemberId(null)}>
        <Text style={styles.modalTitle}>Rename member</Text>
        <TextField value={renameDraft} onChangeText={setRenameDraft} placeholder="Name" autoFocus />
        <Button label="Save" onPress={handleRenameMember} style={styles.saveButton} />
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
