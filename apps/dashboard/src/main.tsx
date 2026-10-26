import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { getToken, setToken } from "./api";
import { Config } from "./pages/Config";
import { Releases } from "./pages/Releases";
import { Sales } from "./pages/Sales";
import "./styles.css";

type Tab = "sales" | "releases" | "config";

function Login({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  return (
    <form className="card login" onSubmit={(e) => { e.preventDefault(); setToken(value); onDone(); }}>
      <h2>Entrar</h2>
      <input type="password" placeholder="Token de administrador" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="submit">Entrar</button>
    </form>
  );
}

function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState<Tab>("sales");
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  const tabs: Array<[Tab, string]> = [["sales", "Vendas"], ["releases", "Liberações"], ["config", "Configuração"]];
  return (
    <>
      <header>
        <strong>Urban Lavanderia</strong>
        <nav>
          {tabs.map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <button onClick={() => { setToken(""); setAuthed(false); }}>Sair</button>
      </header>
      <main>
        {tab === "sales" && <Sales />}
        {tab === "releases" && <Releases />}
        {tab === "config" && <Config />}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
