# Urban Lavanderia — Pagamentos e liberação de máquinas

Sistema próprio de pagamento/liberação para as lavanderias de autosserviço (substitui a Cicclo).
Este repositório traz a **fundação da Fase 1 que não depende de hardware**: backend, dashboard e um
simulador de placa ESP32. O plano completo está no documento "plano técnico" do projeto.

```
packages/protocol   contrato MQTT (tópicos e mensagens), compartilhado
apps/backend        API REST (Fastify + Postgres + MQTT)
apps/dashboard      painel web React (Vite)
apps/simulator      simulador de ESP32 via MQTT
infra/mosquitto     config do broker para desenvolvimento
```

## Como rodar

### Opção 1 — Docker (tudo junto)

```bash
docker compose up --build
```

- Dashboard: http://localhost:5173 (token de admin: `dev-admin-token`)
- API: http://localhost:3000 (`/health`)
- O backend cria as tabelas e uma **loja demo** (4 máquinas, placas `esp-m1..esp-m4`); o simulador sobe as 4 placas.

### Opção 2 — Local (Node 22+)

Precisa de Postgres e de um broker MQTT (o `docker compose up postgres mosquitto` serve).

```bash
npm install
npm run dev:backend      # http://localhost:3000   (aplica migrações sozinho)
npm -w @lav/backend run seed   # opcional: loja demo
npm run dev:simulator    # sobe esp-m1..esp-m4
npm run dev:dashboard    # http://localhost:5173
```

Variáveis do backend (`apps/backend/src/config.ts`): `DATABASE_URL`, `MQTT_URL`, `ADMIN_TOKEN`, `POS_TOKEN`,
`COMMAND_TTL_SECONDS` (60), `ACK_TIMEOUT_SECONDS` (60), `REQUIRE_DEVICE_ONLINE` (true), `ENABLE_SIMULATED_PAYMENTS` (true).
Simulador: `MQTT_URL`, `DEVICE_IDS`, `PULSE_MS`, `DROP_ACKS=true` (não confirma), `FAIL_ALL=true` (rejeita tudo).

### Testar o fluxo ponta a ponta sem hardware

Com tudo no ar (loja demo):

```bash
STORE=loja-demo; POS="Authorization: Bearer dev-pos-token"
# 1. cria o pedido (Idempotency-Key evita pedido duplicado em reenvio)
curl -s -X POST localhost:3000/orders -H "$POS" -H 'content-type: application/json' -H 'Idempotency-Key: teste-1' \
  -d "{\"storeId\":\"$STORE\",\"machineIds\":[\"m1\",\"m3\"]}"
# 2. registra o pagamento (use o id do pedido); o simulador imprime "PULSO canal 100/300"
curl -s -X POST localhost:3000/orders/<ORDER_ID>/payments -H "$POS" -H 'content-type: application/json' \
  -d '{"provider":"simulated","payload":{"externalId":"pay-1","method":"PIX"}}'
```

Repetir o passo 2 com o mesmo `externalId` devolve o mesmo pedido e **não** gera novo pulso. Veja o resultado em
"Vendas" e "Liberações" no dashboard.

## Testes

```bash
npm test             # backend (Postgres em memória + broker MQTT em memória + simulador) e simulador
npm run typecheck
npm run build:dashboard
```

Os testes cobrem: cadastro/validação (canal 100–1000), fluxo pedido→pagamento→comando→pulso→`DONE`, relatório de
vendas, pagamento recusado, idempotência (chave do pedido, pagamento repetido em paralelo, segundo pagamento),
placa offline (venda recusada; comando pendente entregue na volta), falta de confirmação (`UNCONFIRMED` sem reenvio
automático) e rejeição pela placa (`FAILED`).

## Desenho

**Modelo**: `stores`, `machines` (WASHER/DRYER, `channel` 100–1000, `device_id` da placa, preço próprio opcional),
`prices` (por loja e tipo), `orders` + `order_items`, `payments`, `release_commands` (estado) e `release_events` (log).

**Fluxo**: o app da P2 cria o pedido (`PENDING`) → paga → envia o resultado a `POST /orders/:id/payments` → backend marca
`PAID` e cria **um comando por máquina** (chave única por item) → publica em `lav/<deviceId>/cmd` (QoS 1) →
a placa executa o pulso e responde em `lav/<deviceId>/ack` → `DONE`.

**Estados do comando**: `PENDING` (criado/placa offline; reentregue até expirar) → `SENT` → `DONE`. Sem ack em
`ACK_TIMEOUT_SECONDS` vira `UNCONFIRMED` e **não é reenviado sozinho** (evita liberar duas vezes); o dono reenvia pelo
dashboard (mesmo `commandId`, a placa ignora repetido). Também: `FAILED` (placa rejeitou) e `EXPIRED`.

**MQTT** (`packages/protocol`): `lav/<id>/cmd` (backend→placa), `lav/<id>/ack` (placa→backend), `lav/<id>/status`
(retained, `online`/`offline`; `offline` via LWT). A venda só é aceita com a placa online (`REQUIRE_DEVICE_ONLINE`).

**Pagamento abstraído** (`apps/backend/src/payments`): interface `PaymentProvider` que converte o retorno do provedor em um
resultado neutro (`externalId`, status, valor). Há `simulated` (dev/testes) e `stone_deeplink` (traduz o `pay-response`
do Deeplink da Stone; **campos ainda não validados no sandbox da Stone**). O app Kotlin da P2 só precisa chamar
`/pos/stores/:id/config`, `POST /orders` e `POST /orders/:id/payments`. Idempotência por `(provider, externalId)`.

## API (resumo)

Admin (`Authorization: Bearer $ADMIN_TOKEN`): `GET/POST/PATCH /stores`, `GET/POST/PATCH /machines`, `GET/PUT /prices`,
`GET /reports/sales?from&to&storeId`, `GET /orders`, `GET /commands`, `GET /commands/:id` (com log),
`POST /commands/:id/retry`, `GET /devices`.
POS (`POS_TOKEN`): `GET /pos/stores/:id/config`, `POST /orders`, `GET /orders/:id`, `POST /orders/:id/payments`.

## Limitações conhecidas (a tratar nas próximas fases)

- Autenticação é por token fixo (sem usuários/perfis); falta TLS e credenciais/ACL por placa no MQTT.
- Presença da placa fica em memória do backend (uma instância só); não há reserva de máquina em uso nem status de ciclo.
- Sem estorno/cancelamento, reconciliação com a Stone nem webhooks.
- O mapa canal→ciclo e o protocolo real da ESP32 da Cicclo são desconhecidos; o contrato MQTT é nosso.
- Relatório agrupa por dia no fuso `America/Sao_Paulo`; migrações são um SQL simples executado na subida.
- Não testado: `docker compose` (não havia Docker no ambiente de desenvolvimento) e Postgres real (testes usam pg-mem).
