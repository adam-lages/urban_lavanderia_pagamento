import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";
import { AuthProvider } from "../auth";
import { setSession, type Role } from "../api";
import { ThemeRegistry } from "../theme";

export function renderApp(
  path = "/",
  { token = "", role = "FRANQUIA" as Role, email = "urbanlavanderia@gmail.com" }: { token?: string; role?: Role; email?: string } = {},
) {
  setSession(token, token ? { id: "test-user", email, role } : null);
  return render(
    <ThemeRegistry>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </ThemeRegistry>,
  );
}
