import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/lib/theme";

type Mode = "choose" | "create" | "join";

export default function SetupScreen() {
  const { t } = useTranslation();
  const { refetch } = useProfile();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
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

    await refetch();
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

    await refetch();
  }

  if (mode === "choose") {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>👋</Text>
        <Text style={styles.title}>{t("setup.welcome")}</Text>
        <Text style={styles.subtitle}>{t("setup.chooseSubtitle")}</Text>
        <Button label={t("setup.createAFamily")} onPress={() => setMode("create")} />
        <Button label={t("setup.joinWithInviteCode")} variant="secondary" onPress={() => setMode("join")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>{mode === "create" ? t("setup.createYourFamily") : t("setup.joinAFamily")}</Text>
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
      />
      <TouchableOpacity onPress={() => setMode("choose")} disabled={isSubmitting}>
        <Text style={styles.linkText}>{t("common.back")}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  badge: {
    fontSize: 40,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  linkText: {
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
