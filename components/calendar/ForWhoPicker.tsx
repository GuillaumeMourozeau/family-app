import { StyleSheet, View } from "react-native";
import type { FamilyMember } from "@/hooks/useFamilyMembers";
import { Chip } from "@/components/Chip";
import { FieldLabel } from "@/components/FieldLabel";
import { getMemberColor, NEUTRAL_COLOR } from "@/lib/memberColors";
import { spacing } from "@/lib/theme";

type Props = {
  members: FamilyMember[];
  appliesToWholeFamily: boolean;
  participantIds: string[];
  onChange: (next: { appliesToWholeFamily: boolean; participantIds: string[] }) => void;
};

export function ForWhoPicker({ members, appliesToWholeFamily, participantIds, onChange }: Props) {
  function selectWholeFamily() {
    onChange({ appliesToWholeFamily: true, participantIds: [] });
  }

  function toggleMember(id: string) {
    if (appliesToWholeFamily) {
      onChange({ appliesToWholeFamily: false, participantIds: [id] });
      return;
    }
    const next = participantIds.includes(id) ? participantIds.filter((p) => p !== id) : [...participantIds, id];
    onChange({ appliesToWholeFamily: false, participantIds: next });
  }

  return (
    <View style={styles.container}>
      <FieldLabel icon="people-outline" label="For who" />
      <View style={styles.chipRow}>
        <Chip label="Whole family" selected={appliesToWholeFamily} onPress={selectWholeFamily} color={NEUTRAL_COLOR} />
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.full_name ?? "Member"}
            selected={!appliesToWholeFamily && participantIds.includes(m.id)}
            onPress={() => toggleMember(m.id)}
            color={getMemberColor(m)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
