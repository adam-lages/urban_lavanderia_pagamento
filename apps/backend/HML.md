# Guia HML — Backend (servidor)

Este arquivo explica o **servidor** do projeto, em linguagem simples.  
Pasta real no repositório: `apps/backend/` (não existe uma pasta `backend/` na raiz).

## O que é este projeto

É o “cérebro” no computador: guarda lojas e máquinas, recebe o pedido de pagamento, manda o comando de **liberar** para a placa (ESP32) pelo MQTT (um recado rápido na rede) e registra se deu certo.

Tecnologias de hoje: Node.js, Fastify (API HTTP), Postgres (banco) e um broker MQTT (Mosquitto no Docker).

O contrato dos recados MQTT (nomes dos tópicos) está em `packages/protocol`. O simulador de placa, para testar sem hardware, está em `apps/simulator`.

## Como rodar e onde mexer

### Tudo junto (Docker)

Na raiz:

```bash
docker compose up --build
```

- API: **http://localhost:3000** (teste: `/health`)
- Dashboard: http://localhost:5173
- Banco: porta **5432**
- MQTT: porta **1883**

O backend aplica as tabelas sozinho e, se o banco estiver vazio, cria a **loja demo**.

### Só o backend no computador (Node 22+)

Suba Postgres e Mosquitto (`docker compose up postgres mosquitto` serve) e, na raiz:

```bash
npm install
npm run dev:backend
npm -w @lav/backend run seed    # só se quiser a loja demo
```

Arquivos mais comuns:

- `src/config.ts` — lê as variáveis de ambiente
- `src/app.ts` — rotas da API
- `src/seed.ts` — loja demo
- `src/payments/` — como o pagamento é interpretado (`simulated` e `stone_deeplink`)
- `src/migrations/` — SQL das tabelas

Seed atual (quando o banco está vazio): loja `loja-demo` (código `DEMO`), preços R$ 18,00 lava / R$ 12,00 seca, máquinas `m1`…`m4` ligadas às placas `esp-m1`…`esp-m4`, canais 100, 200, 300, 400.

## O que dá para configurar HOJE

Tudo o que o backend usa hoje está no **`.env` da raiz** (versionado de propósito: repositório **privado**). Não há credenciais Stone nem LG neste arquivo — elas ainda não existem no projeto.

Valores **atuais** do `.env`:

| Variável | Significado | Valor atual |
| --- | --- | --- |
| `POSTGRES_USER` | usuário do banco | `lav` |
| `POSTGRES_PASSWORD` | senha do banco | `lav` |
| `POSTGRES_DB` | nome do banco | `lav` |
| `DATABASE_URL` | endereço completo do Postgres | `postgres://lav:lav@localhost:5432/lav` |
| `MQTT_URL` | endereço do broker | `mqtt://localhost:1883` |
| `MQTT_USERNAME` | usuário MQTT | vazio (sem senha no Mosquitto de dev) |
| `MQTT_PASSWORD` | senha MQTT | vazio |
| `ADMIN_TOKEN` | senha-única do painel e das rotas de admin | `dev-admin-token` |
| `POS_TOKEN` | senha-única das rotas da maquininha | `dev-pos-token` |
| `PORT` | porta HTTP da API | `3000` |
| `COMMAND_TTL_SECONDS` | até quando um comando de liberação vale | `60` |
| `ACK_TIMEOUT_SECONDS` | espera pela confirmação da placa | `60` |
| `REQUIRE_DEVICE_ONLINE` | recusa venda se a placa estiver offline | `true` |
| `ENABLE_SIMULATED_PAYMENTS` | aceita pagamento falso `simulated` | `true` |
| `DEVICE_IDS` | placas do **simulador** (não do backend) | `esp-m1,esp-m2,esp-m3,esp-m4` |
| `API_URL` | usada pelo **dashboard** | `http://localhost:3000` |

Mosquitto de desenvolvimento (`infra/mosquitto/mosquitto.conf`): porta **1883**, **sem** login e **sem** TLS (`allow_anonymous true`). Isso **não** serve para internet aberta.

Rotas úteis:

- Admin (`Authorization: Bearer` + `ADMIN_TOKEN`): lojas, máquinas, preços, relatórios, comandos, placas (`/boards`)
- POS (`POS_TOKEN` ou o token de admin): `GET /pos/stores/:id/config`, `POST /orders`, `POST /orders/:id/payments`
- Pagamento simulado (dev): `provider: "simulated"`
- Esqueleto Stone no backend: `provider: "stone_deeplink"` (só traduz o JSON do deeplink; **não** há token Stone no repo)

Simulador (opcional, `apps/simulator`): `MQTT_URL`, `DEVICE_IDS`, `PULSE_MS` (padrão 500), `DROP_ACKS=true` (não confirma), `FAIL_ALL=true` (rejeita tudo).

## Passos futuros (planejados)

- Login de usuários de verdade (hoje é um token fixo para todo mundo)
- TLS no HTTP e no MQTT, usuário/senha e permissão **por placa** no broker
- Reserva de máquina em uso e status do ciclo (lavando / livre)
- Estorno, cancelamento e conferência com a Stone (webhooks)
- App da P2 chamando de verdade `POST /orders` e `POST /orders/:id/payments` (veja `pos-p2/HML.md`)
- Protocolo serial real da máquina LG (ainda desconhecido; a ESP32 só escuta em modo sniffer)

## Como fazer uma mudança pequena com segurança

**Trocar os tokens**

1. Edite `ADMIN_TOKEN` e/ou `POS_TOKEN` no `.env`.
2. Reinicie o backend.
3. Atualize o token no dashboard e em qualquer `curl` de teste.
4. Confira: `curl -s localhost:3000/health` e uma chamada com o token novo (ex.: `GET /stores`).

**Adicionar uma máquina (sem ESP32, usando o simulador)**

1. Coloque um id novo em `DEVICE_IDS` no `.env` (ex.: `esp-m5`) e reinicie o simulador.
2. Crie a máquina no admin (`POST /machines`) com o mesmo `deviceId`, canal entre 100 e 1000, loja existente.
3. Ou use a tela **Máquinas** do dashboard quando a placa aparecer online.

**Não invente** chaves Stone, Stonecode ou senha da LG neste arquivo: o projeto ainda não as tem.
