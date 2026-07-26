import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { ProfileProvider, useProfile } from "@/hooks/useProfile";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ textAlign: "center", color: "#6B7280" }}>{message}</Text>
    </View>
  );
}

function FamilyGate({ children }: { children: React.ReactNode }) {
  const { profile, isLoading } = useProfile();
  const pathname = usePathname();
  usePushNotifications();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const hasFamily = !!profile?.family_id;
  const isOnSetup = pathname === "/setup";

  if (!hasFamily && !isOnSetup) {
    return <Redirect href="/setup" />;
  }

  if (hasFamily && isOnSetup) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <ErrorScreen message="Couldn't connect. Check your internet connection and reopen the app." />;
  }

  return (
    <ProfileProvider>
      <FamilyGate>
        <Stack screenOptions={{ headerShown: false }} />
      </FamilyGate>
    </ProfileProvider>
  );
}
