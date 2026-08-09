import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = { icon: string; size: number; color: string };

const MCI_PREFIX = "mci:";

export function GroceryStoreIcon({ icon, size, color }: Props) {
  if (icon.startsWith(MCI_PREFIX)) {
    return (
      <MaterialCommunityIcons
        name={icon.slice(MCI_PREFIX.length) as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size}
        color={color}
      />
    );
  }
  return <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />;
}
