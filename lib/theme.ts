export const colors = {
  background: "#FAF8F5",
  surface: "#F2F2F2",
  surfaceMuted: "#F9FAFB",
  border: "#E5E7EB",
  borderLight: "#F3F1EE",
  text: "#1F2937",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  primary: "#FF6B4A",
  primaryDark: "#FF3D68",
  primaryMuted: "#FFE7E0",
  purple: "#7C3AED",
  purpleTint: "#F1EBFF",
  blue: "#2563EB",
  blueTint: "#DCEBFF",
  green: "#16A34A",
  greenTint: "#E4F8EC",
  gold: "#F59E0B",
  goldTint: "#FFF3E0",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
  dangerTint: "#FFECEC",
  white: "#FFFFFF",
};

export const gradients = {
  primary: [colors.primary, colors.primaryDark] as const,
  gold: ["#FFCB7C", "#FF9B54"] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 22,
  pill: 999,
};

export const sectionColors = {
  home: colors.primary,
  calendar: colors.purple,
  todo: colors.blue,
  groceries: colors.green,
  meals: colors.gold,
};

export const sectionTints = {
  calendar: colors.purpleTint,
  todo: colors.blueTint,
  groceries: colors.greenTint,
  meals: colors.goldTint,
};

export const cardShadow = {
  shadowColor: "#1F2937",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 3,
};
