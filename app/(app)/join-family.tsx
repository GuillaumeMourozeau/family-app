import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useMyFamilies } from "@/hooks/useMyFamilies";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/lib/theme";

type Mode = "choose" | "create" | "join";

export default function JoinFamilyScreen() {
  const { t } = useTranslation();
  const { profile, refetch } = useProfile();
  const { refetch: refetchMyFamilies } = useMyFamilies();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState(profile?.full_name ?? "");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !familyName.trim()) {
      Alert.alert(t("setup.missingInfo"), t("setup.enterNameAndFamilyName"));
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.rpc("create_family", {
      family_name: familyName.trim(),
      member_name: name.trim(),
    });
    setIsSubmitting(false);
    if (error) {
      Alert.alert(t("setup.couldntCreateFamily"), error.message);
      return;
    }
    await Promise.all([refetch(), refetchMyFamilies()]);
    router.back();
  }

  async function handleJoin() {
    if (!name.trim() || !inviteCode.trim()) {
      Alert.alert(t("setup.missingInfo"), t("setup.enterNameAndInviteCode"));
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.rpc("join_family", {
      code: inviteCode.trim(),
      member_name: name.trim(),
    });
    setIsSubmitting(false);
    if (error) {
      Alert.alert(t("setup.couldntJoinFamily"), error.message);
      return;
    }
    await Promise.all([refetch(), refetchMyFamilies()]);
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (mode === "choose" ? router.back() : setMode("choose"))}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === "choose" ? t("setup.joinNewFamilyTitle") : mode === "create" ? t("setup.createFamilyTitle") : t("setup.joinFamilyTitle")}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {mode === "choose" ? (
        <View style={styles.content}>
          <Text style={styles.subtitle}>{t("setup.joinChooseSubtitle")}</Text>
          <Button label={t("setup.createAFamily")} onPress={() => setMode("create")} style={styles.button} />
          <Button
            label={t("setup.joinWithInviteCode")}
            variant="secondary"
            onPress={() => setMode("join")}
            style={styles.button}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <TextField placeholder={t("setup.yourNamePlaceholder")} value={name} onChangeText={setName} editable={!isSubmitting} />
          {mode === "create" ? (
            <TextField
              placeholder={t("setup.familyNamePlaceholder")}
              value={familyName}
              onChangeText={setFamilyName}
              editable={!isSubmitting}
            />
          ) : (
            <TextField
              placeholder={t("setup.inviteCodePlaceholder")}
              autoCapitalize="characters"
              value={inviteCode}
              onChangeText={setInviteCode}
              editable={!isSubmitting}
            />
          )}
          <Button
            label={mode === "create" ? t("setup.create") : t("setup.join")}
            onPress={mode === "create" ? handleCreate : handleJoin}
            loading={isSubmitting}
            style={styles.button}
          />
        </View>
      )}
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
  headerSpacer: { width: 24 },
  content: { padding: spacing.lg, gap: spacing.md },
  subtitle: { fontSize: 15, color: colors.textMuted, marginBottom: spacing.sm },
  button: { marginTop: spacing.xs },
});
