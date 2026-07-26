import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // No login screen: every device gets a bare anonymous session on first
    // launch and goes straight to create/join family. There's no email or
    // password to recover an identity with, so this is device-only by design.
    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setIsLoading(false);
        return;
      }
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error("Anonymous sign-in failed", error);
      }
      setSession(signInData?.session ?? null);
      setIsLoading(false);
    }
    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
