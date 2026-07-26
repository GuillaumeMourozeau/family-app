import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { useMyFamilies } from "@/hooks/useMyFamilies";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/lib/theme";

type Mode = "choose" | "create" | "join";

export default function JoinFamilyScreen() {
  const { profile, refetch } = useProfile();
  const { refetch: refetchMyFamilies } = useMyFamilies();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState(profile?.full_name ?? "");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !familyName.trim()) {
      Alert.alert("Missing info", "Enter your name and a family name.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.rpc("create_family", {
      family_name: familyName.trim(),
      member_name: name.trim(),
    });
    setIsSubmitting(false);
    if (error) {
      Alert.alert("Couldn't create family", error.message);
      return;
    }
    await Promise.all([refetch(), refetchMyFamilies()]);
    router.back();
  }

  async function handleJoin() {
    if (!name.trim() || !inviteCode.trim()) {
      Alert.alert("Missing info", "Enter your name and the invite code.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.rpc("join_family", {
      code: inviteCode.trim(),
      member_name: name.trim(),
    });
    setIsSubmitting(false);
    if (error) {
      Alert.alert("Couldn't join family", error.message);
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
          {mode === "choose" ? "Join a New Family" : mode === "create" ? "Create Family" : "Join Family"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {mode === "choose" ? (
        <View style={styles.content}>
          <Text style={styles.subtitle}>Create a new family group or join an existing one with an invite code.</Text>
          <Button label="Create a family" onPress={() => setMode("create")} style={styles.button} />
          <Button
            label="Join with an invite code"
            variant="secondary"
            onPress={() => setMode("join")}
            style={styles.button}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <TextField placeholder="Your name" value={name} onChangeText={setName} editable={!isSubmitting} />
          {mode === "create" ? (
            <TextField
              placeholder="Family name (e.g. The Smiths)"
              value={familyName}
              onChangeText={setFamilyName}
              editable={!isSubmitting}
            />
          ) : (
            <TextField
              placeholder="Invite code"
              autoCapitalize="characters"
              value={inviteCode}
              onChangeText={setInviteCode}
              editable={!isSubmitting}
            />
          )}
          <Button
            label={mode === "create" ? "Create" : "Join"}
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
