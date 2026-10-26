import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { newDb } from "pg-mem";
import type { Config } from "./config.js";

export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }>;
}

export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  end(): Promise<void>;
}

/** Aceita qualquer Pool compatível com `pg` (inclusive o de pg-mem nos testes). */
export function wrapPool(pool: any): Db {
  return {
    query: (text, params) => pool.query(text, params),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
}

export async function migrate(db: Queryable): Promise<void> {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.query(readFileSync(join(dir, file), "utf8"));
  }
}

export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return e?.code === "23505" || /unique|duplicate key/i.test(e?.message ?? "");
}

/** Postgres de verdade, ou pg-mem (mesmo motor dos testes) quando DATABASE_EMBEDDED=true. */
export function openDb(config: Config): Db {
  if (config.embeddedDb) {
    const mem = newDb().adapters.createPg();
    return wrapPool(new mem.Pool());
  }
  return wrapPool(new pg.Pool({ connectionString: config.databaseUrl }));
}
