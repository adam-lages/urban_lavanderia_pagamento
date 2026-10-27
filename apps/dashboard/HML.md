# Guia HML — Dashboard (painel web)

> **Você precisa estar na branch `dev`.**  
> O comando `npm run dev:dashboard` **não existe** em `main` (lá só tem o README).  
> Rode **na raiz do repositório** (`urban_lavanderia_pagamento`), não em outra pasta.

```bash
git checkout dev
git pull
npm install
npm run dev:dashboard
```

Equivalentes na **raiz**: `npm start` ou `npm run dashboard`.  
Se o terminal já estiver em `apps/dashboard`, use `npm run dev` (sobe o Vite).

Este arquivo explica o **painel de computador** do projeto, em linguagem simples.  
Pasta real no repositório: `apps/dashboard/` (não existe uma pasta `dashboard/` na raiz).

## O que é este projeto

É a tela que o dono da lavanderia usa no navegador para ver e controlar as **máquinas**.

Hoje o painel é um site React (biblioteca de telas) montado com Vite (ferramenta que sobe o site na hora). Depois de entrar com um token, aparece um menu à esquerda.

| Rota | Tela | Hoje |
| --- | --- | --- |
| `/` | Início | só um aviso “Em breve.” |
| `/clientes` | Listagem de clientes | **funciona** (lista, filtro por nome/CPF, exportar, detalhes) |
| `/vendas` | Listagem de vendas | **funciona** (filtro por loja e cliente, paginação) |
| `/lavanderias` | Lavanderias | **funciona** (lista, busca, cadastra, edita, exclui) |
| `/cupons` | Cupons | ainda não existe (placeholder) |
| `/maquinas` | Máquinas | **funciona** (filtro por lavanderia, status ESP32, cadastro e detalhes) |
| `/login` | Entrar | pede o token de administrador |

O painel **não guarda** as máquinas sozinho. Ele pergunta para o backend (`apps/backend`) e mostra a resposta.

## Como rodar no localhost (passos iniciais)

Isto é um site Node/React. Use **npm**, não yarn.

**Por quê npm?** Na raiz existem `package.json` (workspaces) e `package-lock.json`. O Docker faz `npm ci` e o CI usa `cache: npm`. **Não há `yarn.lock`.** Os scripts da raiz chamam `npm -w …`. Yarn até pode instalar, mas não é o que o projeto usa — fique no npm.

### O que precisa ter no computador

- **Node.js 22** (o README pede 22+; o `Dockerfile` é `node:22-slim`; o CI instala Node 22).
- **npm** (vem com o Node).
- O **backend no ar** (API Express em http://localhost:3000). Sem ele, o login e a tela Máquinas falham. **Não precisa de Docker.** Veja `apps/backend/HML.md`.

Não instale dependências só dentro de `apps/dashboard/`. Este repo é um **monorepo**: o `npm install` é **na raiz**.

### Passos para ver o painel + a API (cole no terminal)

Na pasta raiz do repositório (`urban_lavanderia_pagamento`). **Não precisa de Docker.**

**Uma vez (ou depois de puxar código novo):**

```bash
npm install
```

**Terminal 1 — servidor Express:**

```bash
npm run dev:backend
```

Espere `backend ouvindo na porta 3000`. Teste: http://localhost:3000/health

**Terminal 2 — este painel:**

```bash
npm run dev:dashboard
```

Equivalente: `npm -w @lav/dashboard run dev` (o Vite sobe com `--host`, porta **5173**).

### 3. Abrir no navegador

**http://localhost:5173**

Na tela **Entrar**, cole o token de administrador. Valor de desenvolvimento no `.env` da raiz: `ADMIN_TOKEN=dev-admin-token`.

### Variáveis que importam aqui

O dashboard **não** tem `.env` próprio. Quase tudo é padrão no código.

| O quê | Onde | No localhost |
| --- | --- | --- |
| Endereço da API | `API_URL` (lida pelo Vite em `vite.config.ts`) | padrão `http://localhost:3000` (igual ao `.env` da raiz) |
| Porta do site | `vite.config.ts` | **5173** |
| Chamadas HTTP | `src/api.ts` | o navegador chama `/api/...`; o Vite tira o `/api` e encaminha para o backend |
| Token | o que você cola no login | precisa ser o `ADMIN_TOKEN` do backend (`dev-admin-token`) |

No Docker (opcional), `API_URL` vira `http://backend:3000`. No computador, se você **não** exportar `API_URL`, o padrão já é localhost — o Vite **não** lê o `.env` da raiz sozinho.

### Outra forma: tudo no Docker (não precisa)

Na raiz: `docker compose up --build` — dashboard na mesma URL **http://localhost:5173**.

### Deu errado?

| Sintoma | O que checar |
| --- | --- |
| `Missing script: "dev:dashboard"` | Você **não está na branch `dev`**. Na raiz: `git checkout dev && git pull` e rode de novo. |
| `npm: command not found` ou Node antigo | Instale Node **22**. Confira com `node -v`. |
| Erro de workspace / pacote `@lav/dashboard` | Você rodou o comando **fora da raiz**. Suba um nível e use `npm install` + `npm run dev:dashboard`. |
| Yarn / `yarn.lock` | Não use. Apague qualquer `yarn.lock` acidental. Use `npm install`. |
| Página abre, mas login ou Máquinas falha | Backend parado. No terminal 1: `npm run dev:backend` (só Node; não precisa de Docker). Teste http://localhost:3000/health. |
| “Não autorizado” | Token diferente do `ADMIN_TOKEN`. Use `dev-admin-token` (ou o valor atual do `.env`) e reinicie o backend se você mudou o token. |
| Porta 5173 ocupada | Já existe outro Vite. Feche-o ou veja o endereço que o terminal imprimiu. |

## Onde mexer no código

Arquivos mais comuns para mexer:

- `src/pages/` — telas (login, máquinas, placeholders)
- `src/nav.ts` — nomes e links do menu
- `src/api.ts` — chamadas HTTP para o backend
- `src/layout/` — menu lateral e o “casco” das páginas
- `vite.config.ts` — porta 5173 e o encaminhamento `/api` → backend

O login **não** tem usuário e senha ainda. Na tela **Entrar**, cole o token de administrador. O valor atual (desenvolvimento) está no `.env` da raiz: `ADMIN_TOKEN=dev-admin-token`. O token fica no navegador (`localStorage`, chave `lav_admin_token`).

## O que dá para configurar HOJE

O dashboard lê **pouca** configuração própria. Quase tudo vem do `.env` da **raiz** e do backend.

| O quê | Onde | Valor atual no repo |
| --- | --- | --- |
| Endereço da API | variável `API_URL` (usada pelo Vite) | `http://localhost:3000` no `.env`. No Docker vira `http://backend:3000` |
| Porta do site | `vite.config.ts` | **5173** |
| Token para entrar | o que você cola no login (precisa ser o `ADMIN_TOKEN` do backend) | `dev-admin-token` |
| Caminho das chamadas | `src/api.ts` | tudo começa com `/api` (o Vite tira o `/api` e manda para o backend) |

**Não existem** neste painel: arquivo `.env` próprio, credenciais Stone, senha da LG, MQTT, SSID de Wi-Fi.

Cadastro de máquina (tela **Máquinas**, depois que a placa aparece online): nome, loja, tipo lava/seca. A liberação de teste chama o backend (`POST /boards/:deviceId/release`).

## Passos futuros (planejados)

- Login de verdade (usuário, senha, perfis), no lugar do token único
- Telas de clientes, vendas e cupons (hoje só o título)
- Relatório de vendas no painel (a API `GET /reports/sales` já existe; a tela ainda não)
- HTTPS (cadeado no navegador) quando o site for público
- Ligar o fluxo do app da maquininha P2 (ainda não há app; veja `pos-p2/HML.md`)

## Como fazer uma mudança pequena com segurança

**Trocar o token de entrada**

1. Altere `ADMIN_TOKEN` no `.env` da raiz (e reinicie o backend).
2. Abra o painel, saia se estiver logado, e cole o **mesmo** token novo.
3. Se o menu Máquinas carregar, o token está certo. Se der “Não autorizado”, o token do navegador e o do backend estão diferentes.

**Não mexa** em Stone/LG daqui: este projeto ainda não tem essas credenciais.

**Adicionar um item no menu** (quando for criar uma tela de verdade): edite `src/nav.ts` e a rota em `src/App.tsx`. Teste as outras rotas do menu para não quebrar a navegação.
