import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** Lê o `.env` da raiz do repositório (o npm workspace roda com cwd em apps/backend). */
export function loadRootEnv(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
  const path = join(root, ".env");
  if (existsSync(path)) dotenv.config({ path });
}
