import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export function Login() {
  const { authed, login } = useAuth();
  const [value, setValue] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (authed) return <Navigate to={from} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(value);
    navigate(from, { replace: true });
  };

  return (
    <div className="login-screen">
      <form className="card login" onSubmit={onSubmit}>
        <p className="brand-mark">Urban Lavanderia</p>
        <h1>Entrar</h1>
        <p className="muted">Use o token de administrador para abrir o painel.</p>
        <input
          type="password"
          placeholder="Token de administrador"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}
