import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";
import { AuthProvider } from "../auth";
import { setToken } from "../api";
import { ThemeRegistry } from "../theme";

export function renderApp(path = "/", { token = "" }: { token?: string } = {}) {
  setToken(token);
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
