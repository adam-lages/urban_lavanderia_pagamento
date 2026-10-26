import { Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const { logout } = useAuth();
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <span className="muted">Operação das lavanderias</span>
          <button type="button" className="ghost" onClick={logout}>Sair</button>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
