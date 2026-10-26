# Guia HML — App P2 da Stone (rascunho)

**Este app ainda não existe neste repositório.** Não há pasta Kotlin, Android Studio nem APK.  
Esta pasta (`pos-p2/`) só guarda o guia para quando o app for criado. Nada aqui instala nada na maquininha.

(Por que não `apps/p2/`? O monorepo trata `apps/*` como pacote npm. Uma pasta vazia ali quebraria `npm install`. Quando o app nascer, ele será Android/Kotlin, não um workspace Node.)

## O que vai ser este projeto

A **Stone P2** é a maquininha (terminal Android, modelo da linha Sunmi P2-B) que o cliente usa na loja.

O plano (veja `docs/plano-tecnico.md`) é um aplicativo **pequeno** na própria P2:

1. Cliente escolhe lavar/secar e quais máquinas.
2. O app chama o app de pagamento da Stone por **deeplink** (um “atalho” `payment-app://pay`). A Stone cuida de cartão, Pix, tela e recibo.
3. O nosso app recebe o resultado e avisa o **nosso backend** (`POST /orders` e `POST /orders/:id/payments`).
4. O backend manda a ESP32 liberar a máquina.

Linguagem prevista: **Kotlin** nativo. Isso ainda **não** foi escrito. Não invente o app agora.

O backend já tem um esqueleto `stone_deeplink` que tenta ler o JSON de volta do deeplink. Os nomes dos campos **ainda não foram validados** no sandbox da Stone.

## Como “rodar” hoje

Não dá. Não existe código neste diretório.

O que você pode testar **sem** a P2:

- Backend + dashboard + simulador (veja `apps/backend/HML.md` e o README da raiz).
- Um pagamento **falso** com `provider: "simulated"` e o token `POS_TOKEN` (valor atual: `dev-pos-token`). Isso **não** é a Stone.

Rotas que o app P2 deverá usar no futuro (já existem no backend):

- `GET /pos/stores/:id/config` — preços e máquinas da loja
- `POST /orders` — cria o pedido (`storeId` + `machineIds`)
- `POST /orders/:id/payments` — envia o resultado do pagamento

Autenticação prevista nessas rotas: cabeçalho `Authorization: Bearer` + `POS_TOKEN`.

## O que é configurável HOJE

**Quase nada deste app**, porque o app não existe.

O que **já** existe no repo e o app vai reutilizar depois:

| Item | Onde | Valor atual | Serve para a P2 hoje? |
| --- | --- | --- | --- |
| `POS_TOKEN` | `.env` na raiz | `dev-pos-token` | token de teste da API; **não** é credencial Stone |
| `ADMIN_TOKEN` | `.env` | `dev-admin-token` | painel, não a maquininha |
| `API_URL` | `.env` | `http://localhost:3000` | só o dashboard/dev; a P2 precisará do endereço **real** do servidor |
| Provedor `stone_deeplink` | `apps/backend/src/payments/stone-deeplink.ts` | esqueleto | não cobra nada sozinho |
| `ENABLE_SIMULATED_PAYMENTS` | `.env` | `true` | pagamento de mentira no PC |

O que **não dá** para configurar ainda (e **não deve ser inventado** neste repo):

- Token do repositório PackageCloud do SDK Stone
- Credencial de integração / sandbox Stone
- Stonecode das lojas
- `return_scheme` do nosso app
- Nome do pacote Android (`applicationId`)
- Chaves de assinatura do APK
- Qualquer senha ou conta da LG/Cicclo

Se alguém pedir para “já colocar o token da Stone” no `.env`: **recusar** até a Stone entregar o valor de verdade no Programa de Parcerias.

## Passos futuros (nesta ordem, resumida)

1. **Parceria Stone** — cadastro no Programa de Parcerias; receber sandbox e o token do SDK. Sem isso não há app homologado na P2 (não vale instalar APK “por fora”).
2. **Criar o projeto Android/Kotlin** nesta pasta (ou em caminho combinado), com telas: escolher máquina → confirmar valor → chamar deeplink.
3. **SDK + deeplink** — Intent `payment-app://pay` com valor em centavos, tipo (débito/crédito/Pix), `order_id`, `return_scheme`. Guardar o pedido **antes** de abrir a Stone, para não perder se a tela reiniciar.
4. **Falar com o nosso backend** — HTTPS, `POS_TOKEN` (depois um token por loja), tratar sucesso (`code` 0, usar `itk` como id externo) e recusa.
5. **Homologação** — roteiro da Stone, APK assinado, Partner Hub, piloto em poucos Stonecodes, depois as 6 lojas.
6. **Só então** desligar pagamento simulado em produção (`ENABLE_SIMULATED_PAYMENTS=false`).

Detalhes e ressalvas (o que é confirmado vs. o que ainda não sabemos) estão em `docs/plano-tecnico.md`.

## Como fazer uma mudança pequena com segurança (enquanto o app não existe)

- **Não crie** projeto Kotlin “só para adiantar” sem o SDK e o fluxo de parceria.
- Para testar o servidor: use o `curl` do README da raiz com `dev-pos-token` e `provider: "simulated"`.
- Quando o token Stone **oficial** chegar, ele vai para um lugar combinado (segredo de homologação), **não** copie token de exemplo da internet.
- Trocar `POS_TOKEN` no `.env` só afeta a API nossa; a maquininha Stone **não** lê esse arquivo.

Quando o código do app nascer, este `HML.md` deve ganhar: como abrir no Android Studio, `applicationId` real, deeplink real e o que ainda for sandbox.
