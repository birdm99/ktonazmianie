import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { pb } from "@/lib/pocketbase";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOidc: () => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(pb.authStore.record as User | null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setUser(null);
      return;
    }
    try {
      const auth = await pb.collection("users").authRefresh<User>({ expand: "calendar" });
      setUser(auth.record);
    } catch {
      pb.authStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    pb.authStore.onChange(() => {
      setUser(pb.authStore.record as User | null);
    });
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await pb.collection("users").authWithPassword<User>(email, password, {
      expand: "calendar",
    });
    setUser(auth.record);
  }, []);

  const loginWithOidc = useCallback(async () => {
    await pb.collection("users").authWithOAuth2({ provider: "oidc" });
    setUser(pb.authStore.record as User);
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginWithOidc, logout, refresh }),
    [user, loading, login, loginWithOidc, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
