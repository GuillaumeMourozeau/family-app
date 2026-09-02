import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useProfile } from "@/hooks/useProfile";
import { onConnectivityChange } from "@/lib/offline/network";
import { withOfflineQueue } from "@/lib/offline/mutate";
import { offlineHandlers, type PushTokenRegisterPayload } from "@/lib/offline/handlers";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Registers this device for push once a profile is available, and keeps the
// token in sync in push_tokens. No-ops on simulators/emulators.
//
// Getting the token itself is a live call to Expo's push service, not a
// mutation with a payload we can queue — so if that step fails (most likely
// because we're offline), there's nothing to persist, and the whole flow is
// just re-attempted the next time connectivity returns. The final DB write,
// once we do have a token, goes through the normal offline queue like any
// other mutation.
export function usePushNotifications() {
  const { profile } = useProfile();
  const isRegisteredRef = useRef(false);

  useEffect(() => {
    if (!profile) return;
    isRegisteredRef.current = false;
    attempt(profile.id);

    return onConnectivityChange((online) => {
      if (online && !isRegisteredRef.current) attempt(profile.id);
    });

    async function attempt(profileId: string) {
      isRegisteredRef.current = await registerForPushNotifications(profileId);
    }
  }, [profile?.id]);
}

async function registerForPushNotifications(profileId: string): Promise<boolean> {
  if (!Device.isDevice) return true;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return true; // a permission denial, not a connectivity issue — don't keep retrying

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return true;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const payload: PushTokenRegisterPayload = { profileId, token };
    await withOfflineQueue("pushTokens:register", payload, () => offlineHandlers["pushTokens:register"](payload));
    return true;
  } catch {
    return false; // likely offline while fetching the token — retry once connectivity returns
  }
}
