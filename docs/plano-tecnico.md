# Plano técnico — Sistema próprio de pagamento e automação para as lavanderias

Data da pesquisa: 26/10/2026. Fontes principais: documentação pública da Stone (SDK Android, Connect Stone, Partner Hub) e páginas da Cicclo. Legenda: **[Confirmado]** = vi na documentação oficial; **[Inferido]** = dedução razoável, não confirmada; **[Não confirmado]** = precisa de resposta da Stone/Cicclo/usuário.

---

## 0. Resumo em 5 linhas

1. É possível, em tese, rodar um app próprio na Stone P2: a Stone tem SDK Android e um fluxo oficial de **homologação + distribuição** pelo Partner Hub. **[Confirmado]**
2. Não dá para instalar o APK por conta própria. O app precisa ser **homologado pela Stone** e liberado para o **Stonecode** de cada loja. **[Confirmado]**
3. O caminho mais simples: app Android que chama o app de pagamento da Stone por **Deeplink** (a Stone cuida de cartão, Pix, tela e recibo). **[Confirmado]**
4. A ESP32 não é problema da Stone: ela fala com o nosso backend (MQTT recomendado). O protocolo atual da placa da Cicclo é desconhecido. **[Não confirmado]**
5. Maior risco: **depender de conseguir entrar no Programa de Parcerias da Stone** e **de poder trocar/reaproveitar as ESP32 da Cicclo**. Isso precisa ser validado antes de escrever qualquer linha de código.

---

## 1. Como desenvolver apps para a Stone P2

### 1.1 O terminal
- A P2 da Stone é uma Sunmi **P2-B** (Android). A SDK Android da Stone suporta oficialmente: Ingenico A8, **Sunmi P2-B**, Positivo L3 e L4. **[Confirmado]** (FAQ Partner Program)
- Confirmar com o usuário o modelo exato impresso atrás da maquininha. **[Não confirmado]**

### 1.2 Três caminhos de integração oferecidos pela Stone
| Caminho | O que é | Serve para nós? |
|---|---|---|
| **SDK Android – Deeplink** | Nosso app roda na própria P2 e chama o app de pagamento da Stone via Intent (`payment-app://pay`). | **Sim, é o caminho principal.** A Stone recomenda como base. |
| **SDK Android – Provider** | Nosso app controla o fluxo de pagamento, transações pendentes, telas e impressão. | Só se o Deeplink não cobrir algo. Muito mais trabalho e risco. |
| **Connect Stone (API)** | Um sistema externo (PDV, servidor) cria um pedido via API Pagar.me e a P2 recebe e cobra. | Alternativa interessante (ver 1.5). |
| AutoTEF | Para totem/autoatendimento com PIN Pad. | Não se aplica (foco é a P2). |

### 1.3 Deeplink — o que sabemos **[Confirmado]**
- Nosso app envia uma Intent `ACTION_VIEW` para `payment-app://pay` com: `return_scheme` (obrigatório), `amount` (em centavos), `transaction_type` (DEBIT, CREDIT, VOUCHER, INSTANT_PAYMENT, **PIX**), `installment_type`, `installment_count`, `order_id`, `editable_amount`.
- O retorno chega por um scheme próprio (`seuscheme://pay-response?...`) com `code` (sucesso/erro), `brand`, `authorization_code`, `itk`, `atk`, `authorization_date_time`, `type`, etc.
- Também há deeplink para **cancelamento**, **impressão** e **reimpressão**.
- O app de pagamento da Stone faz adquirência, telas, **impressão do recibo** e controle de pendências. Nosso app só recebe o resultado.
- `order_id` precisa ser habilitado no app "Ajustes" do POS.
- Os apps Stone precisam estar instalados no POS; o Deeplink só funciona em POS Android fornecidos pela Stone.
- Pagamentos feitos via SDK ficam visíveis no Relatório Stone (versão 3.6.0+ do SDK).

### 1.4 Credenciamento, homologação e distribuição **[Confirmado, com ressalvas]**
Fluxo oficial:
1. **Cadastro no Programa de Parcerias da Stone** → recebe credencial de integração (sandbox) e token do repositório PackageCloud do SDK.
2. **Desenvolvimento** com sandbox (permite simular negada, timeout etc.).
3. **Homologação**: preencher o roteiro de testes; a Stone valida APK (assinado V1 e V2), AndroidManifest, versionName/versionCode, packageName e comportamento por modelo de terminal. Acompanhamento no **Partner Hub**.
4. **Piloto controlado** (só alguns Stonecodes) → depois **Rollout**.
5. **Liberação para o cliente** (as nossas 6 lojas): via Partner Hub → "Minhas integrações → Adicionar lojista" (cliente já Stone) ou na criação/credenciamento do lojista, informando Stonecode/CNPJ. O app aparece no menu **Apps** da P2 em ~10 min a 1 h; precisa de Wi-Fi/dados e reinício do terminal.
6. O Partner Hub é só para parceiros; **o lojista não opera o portal** — a liberação é pedida/gerida pelo parceiro.

Implicações para nós:
- Na prática, **o usuário (ou uma empresa dele) precisa virar "parceiro Stone"**. Para uso interno em 6 lojas próprias, isso parece o caminho, mas **a Stone pode ter critérios comerciais** (volume, CNPJ, aprovação). **[Não confirmado]**
- Não há instalação de APK avulso (sideload) suportada; a loja de apps pública é benefício de "Official Partners". **[Confirmado: loja só para Official Partners]**; sideload em POS Stone **[Inferido: bloqueado]**.
- Limite sugerido para ranking no Partner Locator: APK < 60 MB (não é exigência para nós, mas bom manter).
- Cada nova versão do app passa por nova homologação (reprovação → reenvia com versão maior). Isso afeta a velocidade de correção de bugs. **[Confirmado]**

### 1.5 Alternativa: Connect Stone (API) **[Confirmado]**
- O backend cria um pedido na API do Pagar.me (`closed:false`, `poi_payment_settings`, header `ServiceRefererName` = ID do parceiro no Partner Hub). A P2 recebe e cobra; webhooks `charge.paid` e `charge.refunded` voltam para o servidor.
- Dois modos: **Pagamento Direto** (a P2 entra sozinha na tela de pagamento) e **Listagem de Pedidos** (operador escolhe na lista).
- **Pix e voucher só existem no Connect Stone** segundo essa página (nota: a doc do Deeplink também lista `PIX`; há um possível conflito de docs — validar com a Stone). **[Não confirmado]**
- Não existe sandbox no Connect Stone. Desde fev/2026 exige regras de **split na autorização** no pedido.
- Mas: o cliente ainda precisa de uma tela na P2 para escolher lavar/secar e máquinas. Isso exige um app na P2 (o app da Stone não tem essa UI). Então Connect Stone sozinho **não substitui o app**; poderia ser usado combinado (app P2 escolhe → backend cria pedido → P2 cobra). Mais complexo; **começar com Deeplink**.

### 1.6 Stack viável
| Opção | Prós | Contras |
|---|---|---|
| **Kotlin nativo (recomendado para o app da P2)** | Integração com Intents sem camadas extras; menos riscos com retorno do deeplink; APK pequeno; ciclo de vida previsível; exemplos oficiais da Stone em Kotlin. | Usuário é dev React; curva de Android. |
| **React Native** | Reaproveita conhecimento; já existe caso real de app RN/Expo em P2 com Deeplink funcionando. | Problema documentado: ao voltar do pagamento o app às vezes **reinicia** ou dá "onNewIntent while context is not ready" (processo morto/ não pronto). Exige `launchMode` correto (`singleTask`), tratar `getInitialURL` + evento `url`, e **persistir o estado do pedido antes de chamar a Stone** para recuperar após reinício. A P2 tem pouca memória/CPU. APK maior. |
| Webview/PWA | Mais rápido de fazer | Não chama Deeplink de forma confiável nem controla kiosk; **não recomendado**. |

Recomendação honesta: **o app da P2 é pequeno** (poucas telas). Como o ponto crítico é o ciclo de pagamento/retorno, vale **Kotlin nativo** (ou RN só se o usuário insistir, com o cuidado de persistir estado). O dashboard web e o futuro app mobile (2ª etapa) ficam em React/Next.js/React Native, onde o usuário é forte.

### 1.7 O que **não** sabemos (e é crítico)
- Se a P2 atual de cada loja está **vinculada a um Stonecode do usuário** ou é de uma operação da **Cicclo/parceiro**. **[Não confirmado]**
- Se a Cicclo é "parceira" e o app dela está liberado nos Stonecodes das lojas; trocar o app **exige** que a liberação seja removida e a nossa feita. **[Inferido]**
- Se a Stone permite o usuário ser parceiro para uso próprio (6 lojas, volume pequeno). **[Não confirmado]**
- Condições comerciais/taxas diferentes por estarem via parceiro. **[Não confirmado]**

---

## 2. Arquitetura proposta

```
 [P2 Stone: app próprio] --Deeplink--> [App de pagamento Stone] --> adquirente
        |  ^ resultado (pay-response)
        v  |
   [Backend / API] <----HTTPS---- [Dashboard Web (React)]
        |   ^
        |   | webhooks (opcional: Stone/Pagar.me para conciliação)
        v   |
     [Banco de dados]
        |
     [Broker MQTT (TLS)]  <---- Wi-Fi da loja ---->  [ESP32 por máquina/loja]
                                                          |
                                                    relé/sinal "canais"
                                                          v
                                                 [LG Giant-C Max]
```

### 2.1 Componentes
1. **App da P2 (Kotlin)** — telas: escolher lavar/secar → escolher máquinas → total → pagar (Deeplink) → confirmação → "liberando…". Recebe config da loja (lista de máquinas, preços) do backend e guarda em cache local.
2. **Backend (Node/TypeScript, por ex.)** — API REST para o app, dashboard e (futuro) app mobile; regras de preço; registro de pedidos/pagamentos/liberações; publicação de comandos MQTT; autenticação.
3. **Banco** — PostgreSQL. Tabelas: lojas, máquinas (tipo, canal, ESP32), preços/ciclos, pedidos, itens do pedido, pagamentos, liberações (comandos), eventos de ESP32, usuários.
4. **Dashboard Web (React)** — valores, faturamento por período, clientes/vendas/liberações, estado das máquinas/placas (online/offline), reembolso/liberação manual.
5. **Broker MQTT** — gerenciado (ex. HiveMQ/EMQX Cloud) ou próprio (Mosquitto/EMQX). ESP32 conecta **de dentro para fora** (sem abrir portas na loja).
6. **ESP32 (firmware)** — recebe comando, aciona o "canal" (pulso/sinal), responde com confirmação.

### 2.2 Fluxo de venda (feliz)
1. Cliente escolhe máquinas → o app cria **pedido** no backend (`PENDING`, valor, itens, `orderId` único) — salva também local.
2. App chama o Deeplink Stone com `amount` e `order_id`.
3. Retorno `pay-response` com `code=0` → app envia ao backend `PAID` + dados da Stone (`itk`, `atk`, `authorization_code`, data/hora, bandeira).
4. Backend valida e cria **comandos de liberação** (um por máquina/canal) com `commandId` único → publica no MQTT (QoS 1).
5. ESP32 executa e publica `done` com o mesmo `commandId`. Backend marca `RELEASED` e o app mostra "máquina liberada".

### 2.3 Comunicação com a ESP32: MQTT vs HTTP
- **MQTT (recomendado)**: conexão persistente iniciada pela placa, baixa latência, "última vontade" (LWT) mostra placa offline, sessão persistente guarda comandos por curto período, funciona atrás do NAT/Wi-Fi da loja.
- **HTTP polling**: simples, mas latência maior e mais carga; aceitável como plano B.
- **Rede local direta (P2 → ESP32 via LAN)**: mais rápido e funciona sem internet, mas exige IPs fixos/descoberta e não centraliza dados. Boa opção de **contingência** futura.
- **Importante**: tudo depende do **que a placa atual aceita**. Se a ESP32 é um produto da Cicclo com firmware fechado, **não conseguiremos reaproveitar** sem reflash ou sem protocolo documentado. **[Não confirmado]**

### 2.4 Segurança
- TLS no MQTT (porta 8883), **credenciais por placa** (client id estável + usuário/senha ou certificado), ACL por tópico (cada placa só lê/escreve o seu).
- Comando assinado/validado: `commandId`, `issuedAt`, `expiresAt` curto (ex. 30–60 s), canal e quantidade; a placa rejeita expirado/repetido.
- API com autenticação (JWT/tokens por dispositivo P2 + login por usuário no dashboard, com perfis).
- Segredos (chave Pagar.me, tokens PackageCloud) nunca no app; só no backend/CI.
- Não armazenar dados de cartão: a Stone cuida do cartão (escopo PCI fica com ela). Guardar só identificadores e dados de autorização. **[Inferido]**
- Rede dedicada das ESP32 já existe (bom): permitir só saída para o broker.
- LGPD: dados de cliente (se coletarmos) com consentimento e retenção definida. Na 1ª fase o cliente é anônimo (cartão/Pix na maquininha).

### 2.5 Offline
Dois "offlines" diferentes:
- **P2 sem internet**: o app da Stone precisa de rede para autorizar. Sem internet, o pagamento normalmente falha. O app deve **bloquear a venda** e avisar. Se a P2 tem chip 4G, usar como segundo caminho. **[Inferido]**
- **Backend/ESP32 sem comunicação**: a venda só deve ser aceita se a **placa estiver online** (checar LWT/heartbeat antes de cobrar). Se mesmo assim falhar após cobrar, ver abaixo.
- **Pago, mas não liberou**: o app mostra "pago, aguardando liberação", o backend reentrega o comando enquanto não expirar; se expirar, abre **ocorrência** (estorno via cancelamento Stone ou liberação manual no dashboard).
- Contingência futura: P2 → ESP32 direto pela LAN quando a nuvem cair. Só depois da fase 1.

### 2.6 Idempotência da liberação (evitar "lavar de graça" ou cobrar duas vezes)
- `orderId` e `commandId` únicos; chave única no banco (um pagamento aprovado gera exatamente um comando por item).
- O backend trata o `pay-response` de forma idempotente (reenvio do app não duplica).
- A ESP32 guarda os últimos `commandId` executados (memória não volátil) e **ignora repetidos**, mas **responde `done` de novo**.
- **Nunca reenviar cegamente após falta de confirmação**: se não vier `done` em ~60 s, marcar `UNCONFIRMED` e alertar o dono/operador (um reenvio pode liberar duas vezes). Reenvio só do mesmo `commandId` (que a placa descarta se já executou).
- Reconciliação diária: vendas Stone (Relatório Stone / webhooks) × pagamentos no nosso banco × liberações.
- **Se o app morrer após pagar**: ao reabrir, o app consulta o backend por pedidos `PENDING` recentes e a Stone (via cancelamento/relatório) para reconciliar. Esse é o cenário que mais exige cuidado, principalmente em React Native.

---

## 3. Riscos, pontos legais e contratuais

| # | Risco | Impacto | Mitigação / ação |
|---|---|---|---|
| 1 | **Stone não aceitar o usuário como parceiro** ou exigir condições comerciais | Bloqueia o projeto | Falar com a Stone antes: e-mail `souparceiro@stone.com.br` (indicado na doc) / gerente de conta. |
| 2 | **Ligação P2 ↔ Cicclo** (contrato, exclusividade, multa, taxas, equipamento em comodato) | Pode impedir a troca | Ler o contrato da Cicclo e da Stone; confirmar de quem é o terminal e o Stonecode. |
| 3 | **Taxas MDR/Pix** podem mudar ao sair do pacote da Cicclo | Custo | Pedir proposta à Stone para as 6 lojas (débito/crédito/Pix). **[Não confirmado]** |
| 4 | **ESP32 e controladoras são da Cicclo** (hardware/firmware fechado, propriedade, licença) | Pode obrigar a trocar as placas | Verificar propriedade, fotos, modelo, protocolo; plano B: placa nossa (ESP32 + relés) |
| 5 | **Garantia da LG** / segurança elétrica ao ligar na placa de comando | Perda de garantia, risco | Usar o mesmo ponto de "canal/moeda" que a placa atual usa, sem modificar a máquina; conferir com técnico/LG. **[Não confirmado]** |
| 6 | **Homologação por versão** atrasa correções | Operacional | Planejar releases, piloto em 1 loja, manter backlog de correção. |
| 7 | **Reprovação na homologação** | Atraso | Seguir roteiro e testar por modelo de terminal desde cedo. |
| 8 | Docs com divergências (ex. Pix no Deeplink vs. Connect) | Surpresa em testes | Validar no sandbox/com a Stone antes de fechar o fluxo. |
| 9 | Retorno do Deeplink perdido (app reiniciado) → cobrou e não liberou | Cliente brava, estorno | Persistência local, reconciliação, tela "reprocessar", suporte rápido. |
| 10 | Internet/Wi-Fi da loja instável | Vendas falham | Monitoramento, alerta, 4G como reserva, contingência LAN. |
| 11 | **Fiscal/contábil**: a Stone emite recibo (cupom do cartão); venda de serviço de lavanderia pode ter obrigação de NFS-e dependendo do município/regime | Autuação | O usuário diz que não precisa; **recomendo confirmar com o contador**. **[Não confirmado]** |
| 12 | LGPD/segurança de dados | Multa/vazamento | Coletar o mínimo, logs sem dados de cartão. |
| 13 | Dependência de um fornecedor de infra (broker, hospedagem) | Disponibilidade | Escolher provedor com SLA, backups, monitoramento. |
| 14 | **Estornos/cancelamentos**: a Stone cancela pelo app dela; o estorno precisa refletir no nosso sistema | Divergência | Deeplink de cancelamento + reconciliação; webhooks se usarmos Connect. |

Sobre "se a P2 pode rodar app próprio": **sim, mas só via programa de parceiros + homologação** (não é um Android aberto). O terminal é da Stone (ou alugado/comprado do cliente), e o app só chega lá pelo TMS da Stone. **[Confirmado pelo processo oficial; condições comerciais não confirmadas]**

---

## 4. Fases do projeto (estimativas)

Estimativas em semanas de trabalho de 1 dev experiente, e dependem das respostas da seção 5. São aproximadas e devem ser revistas após a Fase 0.

| Fase | Entregas | Estimativa |
|---|---|---|
| **0. Validação e viabilidade** | Conversa com a Stone (parceria, taxas, P2/Stonecode), ler contratos Cicclo/Stone, fotos e engenharia reversa da placa ESP32 (protocolo), decisão: reaproveitar placa ou criar nova. Cadastro no programa de parcerias, acesso ao sandbox. | 1–3 semanas (mais, se dependermos de respostas da Stone/Cicclo) |
| **1. Protótipo de bancada** | ESP32 de teste + relé/sinal; broker MQTT; backend mínimo; app P2 (ou app Android de teste no sandbox) fazendo pagamento via Deeplink e liberando uma máquina de teste. | 3–5 semanas |
| **2. MVP do app P2 + backend** | Fluxo completo (lavar/secar, várias máquinas, Pix/crédito/débito), idempotência, tratamento de falhas, offline/online da placa, logs, impressão/recibo da Stone, cancelamento. | 4–6 semanas |
| **3. Dashboard web** | Login, faturamento por período, vendas, liberações, clientes (se houver), status das placas, ações manuais (liberar/estornar). Pode andar em paralelo à fase 2. | 3–4 semanas |
| **4. Homologação Stone + piloto** | Roteiro de testes, submissão, ajustes pós-reprovação, piloto em 1 loja (idealmente uma com baixo movimento), monitoramento. | 2–4 semanas (**o tempo da Stone não é controlável**) |
| **5. Rollout nas 6 lojas** | Troca por loja, instalação/atualização das placas, treinamento, plano de volta (rollback para Cicclo se contrato permitir). | 2–3 semanas |
| **6. Segunda etapa: app mobile** | Crédito via Pix (carteira pré-paga), QR por máquina, conta do cliente (aqui entram LGPD, saldo, regras de estorno e possivelmente aspectos regulatórios de "saldo/arranjo de pagamento"); usa API do Pagar.me/Pix. | 6–10 semanas, após MVP estável |

Total estimado até as 6 lojas rodando: **~4 a 6 meses de calendário** realistas, sendo o caminho crítico **Stone (parceria + homologação)** e **hardware/protocolo da ESP32**. **[Estimativa, não garantida]**

Sugestão: executar a Fase 0 **antes** de qualquer compromisso de desenvolvimento, porque ela pode mudar o plano inteiro.

---

## 5. Perguntas e informações que precisamos do usuário

### Stone / contratos
1. Qual o **modelo exato** da maquininha (está escrito atrás: "P2", "P2-B"?) e a **versão** do Android/app Stone?
2. Os terminais estão no **seu Stonecode/CNPJ**? Há um Stonecode por loja ou um só? O CNPJ é o mesmo nas 6 lojas?
3. Os terminais foram **comprados, alugados ou fornecidos pela Cicclo**? Existe comodato?
4. Você tem **contrato com a Cicclo**? Qual o prazo, multa de saída, exclusividade e quem é o dono das placas ESP32?
5. Quais as **taxas atuais** (débito, crédito à vista, parcelado, Pix) e quem as recebe (Stone direto ou repasse pela Cicclo)? Há **taxa mensal/percentual para a Cicclo** por venda?
6. Você tem **gerente de conta na Stone**? Aceita que a gente entre em contato com a Stone em seu nome (ou com você junto) para abrir o cadastro de parceiro?
7. Em qual **CNPJ/empresa** vamos cadastrar o parceiro Stone (empresa do usuário, ou empresa do desenvolvimento)? Quem será dono do app?
8. Precisa aceitar **parcelamento** no crédito? Alguma bandeira/voucher específico?

### Máquinas e placa ESP32
9. **Fotos nítidas** da placa ESP32 (frente/verso), dos fios/conectores e de **onde ela liga na máquina** (LG Giant-C Max) — e do que fica ao lado (fonte, relés, conversores).
10. **Modelo da placa** (nome impresso, ESP32 DevKit? ESP32-S3? WROOM?), há marcações, versão de firmware, etiqueta Cicclo?
11. O sinal de "canal" 100–1000: é **pulso elétrico** (como moeda/ficha), **sinal serial** ou **contato seco**? Qual a duração e polaridade? Qual canal corresponde a qual ciclo/preço (ex.: 100 = lavar? 200 = secar? mais tempo?)
12. Como a placa se conecta hoje: **Wi-Fi com qual servidor/protocolo**? (MQTT, HTTP, WebSocket, TCP próprio?) Alguma interface de configuração (AP, Bluetooth, portal web)? Dá para **ler/regravar o firmware** (USB/serial acessível)?
13. A placa é **alimentada** por quê (5 V/12 V/220 V)? Tem **bateria**? E se cai a energia?
14. Quantas **placas por loja** (uma por máquina? uma por conjunto?). Como identificamos qual placa libera qual máquina?
15. Aceitamos **trocar as placas** por modelos nossos se não der para reaproveitar (custo baixo, mas exige instalação elétrica segura)? Quem faz a instalação (técnico/eletricista)? A **garantia LG** é uma preocupação?
16. Máquina tem retorno de **status** (em uso, fim de ciclo, porta aberta)? Queremos mostrar isso?

### Operação do negócio
17. Tabela de **preços** (lavar, secar, por tamanho/temperatura/tempo) e se muda por loja/dia/horário.
18. Pode **liberar várias máquinas num pagamento só**? Quantas ao mesmo tempo? Como funciona **estorno** quando a máquina falha?
19. Como é a **conexão** da P2: Wi-Fi da loja, chip 4G da Stone ou ambos? Qualidade do sinal dentro da loja?
20. Quantos **atendimentos/dia por loja** (para dimensionar e para priorizar piloto)? Qual loja é boa para o piloto?
21. Quem opera o **suporte** quando uma máquina não libera (usuário, funcionário, remoto)? Precisa de botão "liberação manual" no dashboard?
22. Dashboard: quem acessa (só você, gerentes por loja)? Quais relatórios exatos hoje existem na Cicclo (podemos ver telas/prints)?
23. Há **cadastro de cliente** hoje (cadastro com CPF/telefone)? Ou só venda anônima? (impacta LGPD e a 2ª etapa)
24. O contador confirma que **não precisa de NFS-e** para esse serviço no seu município?
25. Preferência de **nome/identidade visual** do app (cores, logo) e idioma (só PT-BR?).
26. Há **acesso** ao dashboard e às configurações atuais da Cicclo (para exportar histórico, preços, mapa de canais)?

### Técnicas
27. Quer **Kotlin nativo** ou prefere **React Native** (ciente dos riscos descritos em 1.6)? Disposição de aprender Kotlin ou terceirizar o app da P2?
28. Preferência de **hospedagem** (AWS, GCP, Azure, outro) e orçamento mensal de infraestrutura (broker, banco, servidor)?
29. Equipe: só você desenvolvendo ou há mais pessoas? Prazo desejado para sair da Cicclo?

---

## 6. Fontes consultadas (públicas)
- Stone SDK Android — Pagamento (Deeplink): https://sdkandroid.stone.com.br/reference/pagamento-deeplink
- Stone SDK Android — Configuração Deeplink: https://sdkandroid.stone.com.br/reference/configuracao-deeplink
- Stone SDK Android — Deeplink vs Provider: https://sdkandroid.stone.com.br/reference/modelos-de-integração-deeplink-vs-provider
- Stone SDK Android — Processo de Integração: https://sdkandroid.stone.com.br/reference/processo-de-integracao
- Stone Partner Program FAQ (homologação, modelos de terminais): https://stone-partnerprogram.helpjuice.com/pt_BR/terminais/guia-do-desenvolvedor
- Stone Partner Program — Liberação para clientes: https://stone-partnerprogram.helpjuice.com/pt_BR/piloto/minha-integração-foi-homologada-como-posso-disponibilizar-para-meus-clientes
- Stone Partner Hub API — Ativar SDK Android: https://partnerhubapi.stone.com.br/reference/ativar-sdk-android
- Connect Stone — Operações / Criar pedido / Webhook: https://connect-stone.stone.com.br/docs/operações
- Stone DevCenter: https://www.stone.com.br/devcenter
- Cicclo — Lavanderias inteligentes e integrações: https://www.cicclo.com/solucoes/laundry
- Caso de uso React Native/Expo em P2 (Stack Overflow): https://stackoverflow.com/questions/79859420
- Referências de MQTT/ESP32 (sessão persistente, LWT, idempotência de comando): documentação ESPHome, RunMQTT, iDryer e um projeto de lavanderia com ESP32 (Bellight).

> Observação: este documento é de planejamento; nenhuma integração foi testada. As informações sobre a Cicclo vieram só do site público; o protocolo da placa ESP32 e o contrato do usuário são desconhecidos.
