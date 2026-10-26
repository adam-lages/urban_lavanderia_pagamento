import { type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { AppLayout } from "./layout/AppLayout";
import { Login } from "./pages/Login";
import { Machines } from "./pages/Machines";
import { Placeholder } from "./pages/Placeholder";

function RequireAuth({ children }: { children: ReactNode }) {
  const { authed } = useAuth();
  const location = useLocation();
  if (!authed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Placeholder title="Início" />} />
        <Route path="/clientes" element={<Placeholder title="Listagem de clientes" />} />
        <Route path="/vendas" element={<Placeholder title="Listagem de vendas" />} />
        <Route path="/lavanderias" element={<Placeholder title="Minhas Lavanderias" />} />
        <Route path="/cupons" element={<Placeholder title="Cupons" />} />
        <Route path="/maquinas" element={<Machines />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
