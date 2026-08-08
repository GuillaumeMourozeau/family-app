import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorScreen } from "@/components/ErrorScreen";
import { setGlobalErrorListener } from "@/lib/globalErrorHandler";
import { initI18n } from "@/lib/i18n";

export default function RootLayout() {
  const [globalError, setGlobalError] = useState<Error | null>(null);
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    setGlobalErrorListener(setGlobalError);
    return () => setGlobalErrorListener(null);
  }, []);

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  if (globalError) {
    return <ErrorScreen error={globalError} />;
  }

  if (!isI18nReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
