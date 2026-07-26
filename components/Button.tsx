import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, type TouchableOpacityProps } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger";

type Props = TouchableOpacityProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function Button({ label, variant = "primary", loading, style, disabled, ...rest }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, variantStyles[variant], (disabled || loading) && styles.disabled, style]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, variant === "secondary" && styles.labelSecondary]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.6 },
  label: { color: colors.white, fontSize: 16, fontWeight: "600" },
  labelSecondary: { color: colors.primary },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryMuted },
  danger: { backgroundColor: colors.danger },
});
