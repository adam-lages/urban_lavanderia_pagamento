import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, startStack, type Stack } from "./helpers.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
});
afterEach(async () => {
  await s.close();
});

const base = { name: "Norte", legalName: "Norte Ltda", cnpj: "11222333000181", role: "FRANQUEADO" };
const login = (email: string, password: string) =>
  s.app.inject({ method: "POST", url: "/auth/login", payload: { email, password } });
const create = (payload: object) => s.app.inject({ method: "POST", url: "/stores", headers: ADMIN, payload });

describe("acesso da lavanderia", () => {
  it("cria o login junto com a lavanderia e não devolve a senha", async () => {
    const res = await create({ ...base, loginEmail: "Norte@Email.com", loginPassword: "segredo123" });
    expect(res.statusCode).toBe(201);
    expect(res.json().loginEmail).toBe("norte@email.com");
    expect(JSON.stringify(res.json())).not.toContain("segredo123");
    const ok = await login("norte@email.com", "segredo123");
    expect(ok.statusCode).toBe(200);
    expect(ok.json().user.role).toBe("FRANQUEADO");
  });

  it("não mostra o e-mail de acesso das lavanderias para o franqueado", async () => {
    await create({ ...base, loginEmail: "norte@email.com", loginPassword: "segredo123" });
    const { token } = (await login("norte@email.com", "segredo123")).json();
    const list = (await s.app.inject({ method: "GET", url: "/stores", headers: { authorization: `Bearer ${token}` } })).json();
    expect(list[0].loginEmail).toBe("");
    const admin = (await s.app.inject({ method: "GET", url: "/stores", headers: ADMIN })).json();
    expect(admin[0].loginEmail).toBe("norte@email.com");
  });

  it("não cria a lavanderia quando o e-mail já é usado", async () => {
    await create({ ...base, loginEmail: "dono@email.com", loginPassword: "segredo123" });
    const dup = await create({ ...base, cnpj: "33444555000181", loginEmail: "dono@email.com", loginPassword: "outra1234" });
    expect(dup.statusCode).toBe(409);
    const list = (await s.app.inject({ method: "GET", url: "/stores", headers: ADMIN })).json();
    expect(list).toHaveLength(1);
  });

  it("cadastra como franqueado quando a permissão não é enviada", async () => {
    const { role: _role, ...noRole } = base;
    expect((await create(noRole)).json().role).toBe("FRANQUEADO");
  });

  it("exige senha no primeiro acesso e senha com 8 caracteres", async () => {
    expect((await create({ ...base, loginEmail: "a@email.com" })).statusCode).toBe(400);
    expect((await create({ ...base, loginEmail: "a@email.com", loginPassword: "curta" })).statusCode).toBe(400);
  });

  it("edita e-mail e senha e remove o acesso ao excluir", async () => {
    const store = (await create({ ...base, loginEmail: "norte@email.com", loginPassword: "segredo123" })).json();
    const patch = (payload: object) =>
      s.app.inject({ method: "PATCH", url: `/stores/${store.id}`, headers: ADMIN, payload });
    expect((await patch({ loginEmail: "novo@email.com" })).json().loginEmail).toBe("novo@email.com");
    expect((await login("novo@email.com", "segredo123")).statusCode).toBe(200);
    await patch({ loginPassword: "trocada123" });
    expect((await login("novo@email.com", "segredo123")).statusCode).toBe(401);
    expect((await login("novo@email.com", "trocada123")).statusCode).toBe(200);
    await s.app.inject({ method: "DELETE", url: `/stores/${store.id}`, headers: ADMIN });
    expect((await login("novo@email.com", "trocada123")).statusCode).toBe(401);
  });
});
