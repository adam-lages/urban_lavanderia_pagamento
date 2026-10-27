import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN, POS, startStack, type Stack } from "./helpers.js";
import { seedCustomersIfEmpty } from "../src/demo-seed.js";

let s: Stack;
beforeEach(async () => {
  s = await startStack();
  await seedCustomersIfEmpty(s.db);
});
afterEach(async () => {
  await s.close();
});

describe("clientes", () => {
  it("lista com paginação e filtra por nome e CPF no banco", async () => {
    const first = await s.app.inject({ method: "GET", url: "/customers?page=0&limit=5", headers: ADMIN });
    expect(first.statusCode).toBe(200);
    expect(first.json().total).toBe(8);
    expect(first.json().items).toHaveLength(5);

    const second = await s.app.inject({ method: "GET", url: "/customers?page=1&limit=5", headers: ADMIN });
    expect(second.json().items).toHaveLength(3);

    const byName = (await s.app.inject({ method: "GET", url: "/customers?name=ana&limit=10", headers: ADMIN })).json();
    expect(byName.total).toBe(1);
    expect(byName.items[0].name).toBe("Ana Souza");
    expect(byName.items[0].age).toBeGreaterThan(20);

    const byCpf = (await s.app.inject({ method: "GET", url: "/customers?cpf=529.982.247-25", headers: ADMIN })).json();
    expect(byCpf.total).toBe(1);
    expect(byCpf.items[0].cpf).toBe("52998224725");
  });

  it("filtra os clientes pela lavanderia onde compraram", async () => {
    await s.db.query("INSERT INTO stores (id, name, code, created_at) VALUES ('st-a','A','10000001',now()), ('st-b','B','10000002',now())");
    await s.db.query(
      "INSERT INTO orders (id, store_id, status, total_cents, customer_id, created_at, paid_at) VALUES ('o-1','st-a','PAID',100,'cli-ana',now(),now()), ('o-2','st-b','PAID',100,'cli-bruno',now(),now())",
    );
    const a = (await s.app.inject({ method: "GET", url: "/customers?storeId=st-a", headers: ADMIN })).json();
    expect(a.total).toBe(1);
    expect(a.items[0].id).toBe("cli-ana");
    const none = (await s.app.inject({ method: "GET", url: "/customers?storeId=st-x", headers: ADMIN })).json();
    expect(none.total).toBe(0);
  });

  it("busca um cliente e recusa quem não é admin", async () => {
    const one = await s.app.inject({ method: "GET", url: "/customers/cli-ana", headers: ADMIN });
    expect(one.statusCode).toBe(200);
    expect(one.json().email).toBe("ana.souza@email.com");
    expect((await s.app.inject({ method: "GET", url: "/customers", headers: POS })).statusCode).toBe(401);
    expect((await s.app.inject({ method: "GET", url: "/customers/nao-existe", headers: ADMIN })).statusCode).toBe(404);
  });

  it("bloqueia e desbloqueia o cliente", async () => {
    const blocked = await s.app.inject({
      method: "PATCH",
      url: "/customers/cli-ana",
      headers: ADMIN,
      payload: { blocked: true },
    });
    expect(blocked.statusCode).toBe(200);
    expect(blocked.json().blocked).toBe(true);
    const open = await s.app.inject({
      method: "PATCH",
      url: "/customers/cli-ana",
      headers: ADMIN,
      payload: { blocked: false },
    });
    expect(open.json().blocked).toBe(false);
  });
});
