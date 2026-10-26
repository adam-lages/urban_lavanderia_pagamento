import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const target = process.env.API_URL ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target, changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, "") } } },
  test: { environment: "jsdom" },
});
