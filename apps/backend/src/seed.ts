import { loadConfig } from "./config.js";
import { migrate, openDb } from "./db.js";
import { seedIfEmpty } from "./demo-seed.js";
import { loadRootEnv } from "./env-file.js";

loadRootEnv();
const config = loadConfig();
const db = openDb(config);
await migrate(db);
await seedIfEmpty(db);
await db.end();
