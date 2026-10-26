import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../nav";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo" aria-hidden="true" />
        <div>
          <strong>Urban Lavanderia</strong>
          <small>Painel operacional</small>
        </div>
      </div>
      <nav aria-label="Menu principal">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
