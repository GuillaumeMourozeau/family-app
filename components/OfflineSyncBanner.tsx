import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useIsOnline } from "@/lib/offline/network";
import { useQueuedMutationCount } from "@/lib/offline/queue";
import { colors, spacing } from "@/lib/theme";

// A slim, always-in-the-same-place strip so "did my change actually save?"
// has a visible answer — offline, or mid-replay after reconnecting.
export function OfflineSyncBanner() {
  const { t } = useTranslation();
  const isOnline = useIsOnline();
  const pendingCount = useQueuedMutationCount();

  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[styles.banner, isOnline ? styles.bannerSyncing : styles.bannerOffline]}>
      <Ionicons name={isOnline ? "sync-outline" : "cloud-offline-outline"} size={14} color={colors.white} />
      <Text style={styles.text}>
        {isOnline
          ? t("common.syncingChanges", { count: pendingCount })
          : pendingCount > 0
            ? t("common.offlineWithPending", { count: pendingCount })
            : t("common.offline")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 6,
  },
  bannerOffline: { backgroundColor: colors.textMuted },
  bannerSyncing: { backgroundColor: colors.primary },
  text: { color: colors.white, fontSize: 12, fontWeight: "700" },
});
