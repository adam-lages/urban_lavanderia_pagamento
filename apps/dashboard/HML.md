# Guia HML — Dashboard (painel web)

Este arquivo explica o **painel de computador** do projeto, em linguagem simples.  
Pasta real no repositório: `apps/dashboard/` (não existe uma pasta `dashboard/` na raiz).

## O que é este projeto

É a tela que o dono da lavanderia usa no navegador para ver e controlar as **máquinas**.

Hoje o painel é um site React (biblioteca de telas) montado com Vite (ferramenta que sobe o site na hora). Depois de entrar com um token, aparece um menu à esquerda.

| Rota | Tela | Hoje |
| --- | --- | --- |
| `/` | Início | só um aviso “Em breve.” |
| `/clientes` | Listagem de clientes | ainda não existe (placeholder) |
| `/vendas` | Listagem de vendas | ainda não existe (placeholder) |
| `/lavanderias` | Minhas Lavanderias | ainda não existe (placeholder) |
| `/cupons` | Cupons | ainda não existe (placeholder) |
| `/maquinas` | Máquinas | **funciona** (lista, cadastra, edita, libera) |
| `/login` | Entrar | pede o token de administrador |

O painel **não guarda** as máquinas sozinho. Ele pergunta para o backend (`apps/backend`) e mostra a resposta.

## Como rodar e onde mexer

Na raiz do repositório (precisa do backend no ar; veja `apps/backend/HML.md`):

```bash
npm install
npm run dev:dashboard
```

Abra **http://localhost:5173**.

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
- Telas de clientes, vendas, lavanderias e cupons (hoje só o título)
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
