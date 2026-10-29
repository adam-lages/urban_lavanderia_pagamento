import { type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import { AppLayout } from "./layout/AppLayout";
import { ClientDetail } from "./pages/ClientDetail";
import { Clients } from "./pages/Clients";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { MachineDetail } from "./pages/MachineDetail";
import { MachineForm } from "./pages/MachineForm";
import { CouponDetail } from "./pages/CouponDetail";
import { CouponForm } from "./pages/CouponForm";
import { Coupons } from "./pages/Coupons";
import { Sales } from "./pages/Sales";
import { StoreDetail } from "./pages/StoreDetail";
import { VoucherDetail } from "./pages/VoucherDetail";
import { VoucherForm } from "./pages/VoucherForm";
import { Wallet } from "./pages/Wallet";
import { StoreForm } from "./pages/StoreForm";
import { Stores } from "./pages/Stores";

function RequireAuth({ children }: { children: ReactNode }) {
  const { authed } = useAuth();
  const location = useLocation();
  if (!authed) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function RequireFranquia({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  if (role !== "FRANQUIA") return <Navigate to="/" replace />;
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
        <Route path="/" element={<Home />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/clientes/:id" element={<ClientDetail />} />
        <Route path="/vendas" element={<Sales />} />
        <Route element={<RequireFranquia><Outlet /></RequireFranquia>}>
          <Route path="/lavanderias" element={<Stores />} />
          <Route path="/lavanderias/nova" element={<StoreForm />} />
          <Route path="/lavanderias/:id/editar" element={<StoreForm />} />
          <Route path="/lavanderias/:id" element={<StoreDetail />} />
          <Route path="/lavanderias/:storeId/maquinas/nova" element={<MachineForm />} />
          <Route path="/lavanderias/:storeId/maquinas/:machineId/editar" element={<MachineForm />} />
          <Route path="/lavanderias/:storeId/maquinas/:machineId" element={<MachineDetail />} />
          <Route path="/cupons/novo" element={<CouponForm />} />
          <Route path="/cupons/:id/editar" element={<CouponForm />} />
          <Route path="/carteira/novo" element={<VoucherForm />} />
          <Route path="/carteira/:id/editar" element={<VoucherForm />} />
        </Route>
        <Route path="/cupons" element={<Coupons />} />
        <Route path="/cupons/:id" element={<CouponDetail />} />
        <Route path="/carteira" element={<Wallet />} />
        <Route path="/carteira/:id" element={<VoucherDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
