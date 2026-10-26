# Guia HML — Backend (servidor)

Este arquivo explica o **servidor** do projeto, em linguagem simples.  
Pasta real no repositório: `apps/backend/` (não existe uma pasta `backend/` na raiz).

## O que é este projeto

É o “cérebro” no computador: guarda lojas e máquinas, recebe o pedido de pagamento, manda o comando de **liberar** para a placa (ESP32) pelo MQTT (um recado rápido na rede) e registra se deu certo.

Tecnologias de hoje: **Node.js + Express** (API HTTP). No computador, o banco e o MQTT já sobem **dentro do próprio Node**. Em produção/hml o banco é Postgres e o MQTT pode ser Mosquitto (Docker opcional).

O contrato dos recados MQTT (nomes dos tópicos) está em `packages/protocol`. O simulador de placa, para testar sem hardware, está em `apps/simulator`.

## Como rodar no localhost (sem Docker)

Isto é um servidor **Node.js com Express**. Use **npm**, não yarn. **Não precisa de Docker.**

**Por quê npm?** Na raiz existem `package.json` (workspaces) e `package-lock.json`. O `Dockerfile` roda `npm ci`; o CI instala com npm. **Não há `yarn.lock`.** Fique no npm.

### O que precisa ter

- **Node.js 22** (`node -v` deve começar com `v22`).
- **npm** (vem com o Node).

Não rode `npm install` só dentro de `apps/backend/`. Sempre na **raiz** do repositório.

### Passos (cole no terminal, nesta ordem)

Na pasta do repositório (`urban_lavanderia_pagamento`):

**Terminal 1 — API (Express)**

```bash
npm install
npm run dev:backend
```

Espere a linha `backend ouvindo na porta 3000`.  
Teste: abra **http://localhost:3000/health** (deve aparecer `{"ok":true}`).

O comando já:

- cria as tabelas
- cria a **loja demo** (se o banco estiver vazio)
- sobe um **banco em memória** (não precisa instalar Postgres)
- sobe um **broker MQTT** na porta **1883** (não precisa do Mosquitto)

**Terminal 2 — painel**

```bash
npm run dev:dashboard
```

Abra **http://localhost:5173**. Na tela Entrar, cole: `dev-admin-token`.

**Terminal 3 (opcional) — placas falsas, para o menu Máquinas ficar Online**

```bash
npm run dev:simulator
```

Equivalente do backend: `npm run dev` ou `npm -w @lav/backend run dev`.

### Banco: o que muda entre o computador e a loja de verdade

| Onde | Banco | O que acontece |
| --- | --- | --- |
| **Seu computador** (`npm run dev:backend`) | Em memória (pg-mem, o mesmo dos testes) | Sobe sozinho. **Some quando você fecha o terminal.** |
| **Docker / hml / produção** | Postgres 16 | Dados ficam gravados. `DATABASE_EMBEDDED=false` e `DATABASE_URL` apontando para o Postgres. |

O `docker-compose.yml` continua no repo se alguém quiser usar. **Não é obrigatório.**

Para forçar Postgres de verdade no Node: no `.env` da raiz, `DATABASE_EMBEDDED=false` (e o Postgres precisa estar no ar).

### MQTT: o que muda

| Onde | Broker | Para quê serve |
| --- | --- | --- |
| **Seu computador** | Aedes **dentro** do backend, porta **1883** | Dashboard + simulador. Só isso já basta para testar o painel. |
| **ESP32 de verdade** | Precisa de um broker que a placa alcance no Wi-Fi | Na placa, `MQTT_HOST` = IP do **PC na LAN** (não `localhost`). O backend em Node já escuta 1883 em todas as placas de rede. Firewall do PC precisa deixar a porta 1883. |
| **Docker / hml** | Mosquitto (opcional) | `MQTT_EMBEDDED=false` e `MQTT_URL=mqtt://…`. |

Se quiser o broker **num terminal separado** (e desligar o embutido com `MQTT_EMBEDDED=false`):

```bash
npm run dev:mqtt
```

### Opção extra — tudo no Docker (não precisa)

```bash
docker compose up --build
```

| Serviço | Endereço |
| --- | --- |
| API (Express) | **http://localhost:3000** (`/health`) |
| Dashboard | http://localhost:5173 |
| Postgres | porta **5432** (`lav` / `lav` / `lav`) |
| MQTT (Mosquitto) | porta **1883** |

### Variáveis

O backend lê o `.env` da **raiz** e também `process.env`. Se não houver arquivo, valem os padrões de `src/config.ts` (modo embutido ligado).

| Variável | Padrão no computador | Para quê |
| --- | --- | --- |
| `PORT` | `3000` | porta HTTP da API |
| `DATABASE_EMBEDDED` | `true` | banco em memória (desligue na produção) |
| `DATABASE_URL` | `postgres://lav:lav@localhost:5432/lav` | só usado se o embutido estiver `false` |
| `MQTT_EMBEDDED` | `true` | broker Aedes no próprio processo |
| `MQTT_URL` | `mqtt://localhost:1883` | só usado se o embutido estiver `false` |
| `ADMIN_TOKEN` | `dev-admin-token` | painel e rotas de admin |
| `POS_TOKEN` | `dev-pos-token` | rotas da maquininha (teste) |

Para testar a placa **sem hardware**, depois do backend: `npm run dev:simulator`.

### Deu errado?

| Sintoma | O que checar |
| --- | --- |
| Node / npm não encontrado | Instale Node **22**. `node -v` deve começar com `v22`. |
| Erro de workspace `@lav/backend` | Comando fora da raiz. Volte para a pasta do `package-lock.json`. |
| Yarn | Não use. Este repo trava no npm. |
| Porta 3000 ocupada | Outro backend já está rodando. Pare um dos dois. |
| Porta 1883 ocupada | Outro MQTT (Mosquitto/Docker) no ar. Feche-o, ou use `MQTT_PORT=1884`. |
| `/health` não responde | Espere o log `backend ouvindo na porta 3000`. |
| Dashboard “Não autorizado” | Token do navegador ≠ `ADMIN_TOKEN`. Use `dev-admin-token`. |
| Loja demo sumiu | Banco em memória: fecheu o terminal, os dados foram embora. Suba de novo (o seed roda sozinho). |

## Onde mexer no código

Arquivos mais comuns:

- `src/config.ts` — lê as variáveis de ambiente
- `src/app.ts` — rotas Express
- `src/server.ts` — sobe HTTP + banco + MQTT
- `src/demo-seed.ts` — loja demo
- `src/payments/` — como o pagamento é interpretado (`simulated` e `stone_deeplink`)
- `src/migrations/` — SQL das tabelas

Opcional: `DEMO_BOARD_ID=esp-<mac da placa>` (ID do monitor serial) cadastra a placa de teste como “Lavadora 1” no seed. Seed atual (quando o banco está vazio): loja `loja-demo` (código `DEMO`), preços R$ 18,00 lava / R$ 12,00 seca, máquinas `m1`…`m4` ligadas às placas `esp-m1`…`esp-m4`, canais 100, 200, 300, 400.

## O que dá para configurar HOJE

Tudo o que o backend usa hoje está no **`.env` da raiz** (versionado de propósito: repositório **privado**). Não há credenciais Stone nem LG neste arquivo — elas ainda não existem no projeto.

Valores **atuais** do `.env`:

| Variável | Significado | Valor atual |
| --- | --- | --- |
| `POSTGRES_USER` | usuário do Postgres (Docker/produção) | `lav` |
| `POSTGRES_PASSWORD` | senha do Postgres | `lav` |
| `POSTGRES_DB` | nome do banco | `lav` |
| `DATABASE_EMBEDDED` | banco em memória no Node | `true` |
| `DATABASE_URL` | endereço do Postgres (se o embutido estiver off) | `postgres://lav:lav@localhost:5432/lav` |
| `MQTT_EMBEDDED` | broker no próprio backend | `true` |
| `MQTT_URL` | endereço do broker (se o embutido estiver off) | `mqtt://localhost:1883` |
| `MQTT_USERNAME` | usuário MQTT | vazio |
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

Mosquitto de desenvolvimento (`infra/mosquitto/mosquitto.conf`): porta **1883**, **sem** login e **sem** TLS. Só se você escolher Docker. Isso **não** serve para internet aberta.

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
2. Reinicie o backend (`Ctrl+C` e `npm run dev:backend` de novo).
3. Atualize o token no dashboard e em qualquer `curl` de teste.
4. Confira: `curl -s localhost:3000/health` e uma chamada com o token novo (ex.: `GET /stores`).

**Adicionar uma máquina (sem ESP32, usando o simulador)**

1. Coloque um id novo em `DEVICE_IDS` no `.env` (ex.: `esp-m5`) e reinicie o simulador.
2. Crie a máquina no admin (`POST /machines`) com o mesmo `deviceId`, canal entre 100 e 1000, loja existente.
3. Ou use a tela **Máquinas** do dashboard quando a placa aparecer online.

**Não invente** chaves Stone, Stonecode ou senha da LG neste arquivo: o projeto ainda não as tem.
