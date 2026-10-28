import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getToken, getUser, setSession, type Role, type SessionUser } from "./api";

interface AuthValue {
  token: string;
  user: SessionUser | null;
  role: Role;
  authed: boolean;
  login: (token: string, user: SessionUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState(getToken);
  const [user, setUsr] = useState(getUser);
  const value = useMemo<AuthValue>(
    () => ({
      token,
      user,
      role: user?.role ?? "FRANQUIA",
      authed: !!token,
      login: (t, u) => {
        setSession(t, u);
        setTok(t);
        setUsr(u);
      },
      logout: () => {
        setSession("", null);
        setTok("");
        setUsr(null);
      },
    }),
    [token, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
