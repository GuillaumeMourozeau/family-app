import { useEffect, useState } from "react";
import { Slot } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorScreen } from "@/components/ErrorScreen";
import { setGlobalErrorListener } from "@/lib/globalErrorHandler";

export default function RootLayout() {
  const [globalError, setGlobalError] = useState<Error | null>(null);

  useEffect(() => {
    setGlobalErrorListener(setGlobalError);
    return () => setGlobalErrorListener(null);
  }, []);

  if (globalError) {
    return <ErrorScreen error={globalError} />;
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
