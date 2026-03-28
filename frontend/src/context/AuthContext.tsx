import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearSession, getStoredUserId, getToken } from "@/services/api";
import * as authService from "@/services/auth.service";
import type { LoginResponse } from "@/types/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  userId: number | null;
  login: (email: string, senha: string) => Promise<LoginResponse>;
  registerAndLogin: (
    nome: string,
    email: string,
    senha: string
  ) => Promise<LoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readUserId(): number | null {
  const raw = getStoredUserId();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const token = tick >= 0 ? getToken() : null;

  const isAuthenticated = Boolean(token);
  const userId = isAuthenticated ? readUserId() : null;

  const login = useCallback(async (email: string, senha: string) => {
    const res = await authService.login(email, senha);
    setTick((t) => t + 1);
    return res;
  }, []);

  const registerAndLogin = useCallback(
    async (nome: string, email: string, senha: string) => {
      const res = await authService.registerAndLogin(nome, email, senha);
      setTick((t) => t + 1);
      return res;
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setTick((t) => t + 1);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      userId,
      login,
      registerAndLogin,
      logout,
    }),
    [isAuthenticated, userId, login, registerAndLogin, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
