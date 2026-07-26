import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, spacing } from "@/lib/theme";

type Mode = "choose" | "create" | "join";

export default function SetupScreen() {
  const { refetch } = useProfile();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
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

    await refetch();
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

    await refetch();
  }

  if (mode === "choose") {
    return (
      <View style={styles.container}>
        <Text style={styles.badge}>👋</Text>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>Create a new family group or join an existing one.</Text>
        <Button label="Create a family" onPress={() => setMode("create")} />
        <Button label="Join with an invite code" variant="secondary" onPress={() => setMode("join")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>{mode === "create" ? "Create your family" : "Join a family"}</Text>
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
      />
      <TouchableOpacity onPress={() => setMode("choose")} disabled={isSubmitting}>
        <Text style={styles.linkText}>Back</Text>
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
