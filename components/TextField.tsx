import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

export function TextField({ style, ...rest }: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textFaint} style={[styles.input, style]} {...rest} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
});
