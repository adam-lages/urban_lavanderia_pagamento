import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";
import { AuthProvider } from "../auth";
import { setToken } from "../api";

const future = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

export function renderApp(path = "/", { token = "" }: { token?: string } = {}) {
  setToken(token);
  return render(
    <MemoryRouter initialEntries={[path]} future={future}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}
