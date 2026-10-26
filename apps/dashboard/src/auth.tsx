import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getToken, setToken } from "./api";

interface AuthValue {
  token: string;
  authed: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState(getToken);
  const value = useMemo<AuthValue>(
    () => ({
      token,
      authed: !!token,
      login: (t) => {
        setToken(t);
        setTok(t);
      },
      logout: () => {
        setToken("");
        setTok("");
      },
    }),
    [token],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
