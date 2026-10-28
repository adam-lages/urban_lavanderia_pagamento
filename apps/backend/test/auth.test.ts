import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "../src/auth.js";
import { seedDefaultUsers, SEED_FRANQUIA_EMAIL, SEED_FRANQUIA_PASSWORD } from "../src/services/users.js";
import { ADMIN, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

async function insertUser(email: string, password: string, role: "FRANQUIA" | "FRANQUEADO") {
  await s.db.query("INSERT INTO users (id, email, password_hash, role, created_at) VALUES ($1,$2,$3,$4,now())", [
    randomUUID(),
    email,
    await hashPassword(password),
    role,
  ]);
}

async function login(email: string, password: string) {
  return s.app.inject({ method: "POST", url: "/auth/login", payload: { email, password } });
}

describe("login e permissões", () => {
  it("entra com o usuário seed da franquia", async () => {
    await seedDefaultUsers(s.db);
    const res = await login(SEED_FRANQUIA_EMAIL, SEED_FRANQUIA_PASSWORD);
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toMatchObject({ email: SEED_FRANQUIA_EMAIL, role: "FRANQUIA" });
    const me = await s.app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${res.json().token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().role).toBe("FRANQUIA");
  });

  it("rejeita senha errada", async () => {
    await seedDefaultUsers(s.db);
    const res = await login(SEED_FRANQUIA_EMAIL, "errada");
    expect(res.statusCode).toBe(401);
  });

  it("bloqueia o franqueado na gestão de lavanderias e máquinas", async () => {
    await insertUser("loja@urban.test", "Senha123@", "FRANQUEADO");
    const session = (await login("loja@urban.test", "Senha123@")).json();
    const headers = { authorization: `Bearer ${session.token}` };

    expect((await s.app.inject({ method: "GET", url: "/stores", headers })).statusCode).toBe(200);
    expect((await s.app.inject({ method: "GET", url: "/sales", headers })).statusCode).toBe(200);
    expect((await s.app.inject({ method: "POST", url: "/stores", headers, payload: { name: "X", legalName: "Razão Social", cnpj: "11222333000181", role: "FRANQUIA" } })).statusCode).toBe(403);
    expect((await s.app.inject({ method: "GET", url: "/machines", headers })).statusCode).toBe(403);
  });

  it("mantém o token de administrador com acesso total", async () => {
    const created = await s.app.inject({
      method: "POST",
      url: "/stores",
      headers: ADMIN,
      payload: { name: "Centro", legalName: "Razão Social", cnpj: "11222333000181", role: "FRANQUIA" },
    });
    expect(created.statusCode).toBe(201);
  });
});
