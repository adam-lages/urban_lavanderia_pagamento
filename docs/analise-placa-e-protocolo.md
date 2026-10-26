---
cursor:
  subagentId: "bc-826ec3a5-d03e-5e1d-aa53-d05f6749a8ed"
---

# Análise da placa LG e do protocolo de liberação das máquinas

Data: 26/10/2026. Complementa `plano-tecnico.md` (seção 2.3). Atualizado no mesmo dia com a programação **r9Pr** do painel LG (seção 9).
Legenda: **[Confirmado]** = visto em foto, painel do dono ou fonte oficial. **[Hipótese]** = dedução razoável, não provada. **[Medir]** = só uma medição resolve.

## 0. Resumo em 8 linhas

1. A LG documenta que a máquina aceita **sistema central de pagamento** ligado ao chicote do painel. **[Confirmado]** (FAQ LG)
2. O conector de leitor de cartão tem **6 fios: 12,5 V, terra, Tx+/Tx−, Rx+/Rx− (serial diferencial)**. O conector de moeda tem 2 fios (16,5 V e terra). **[Confirmado]** (FAQ LG)
3. O seu modelo (CWG27**MDC**RS = "Card/OPL type") **vem preparado para leitor de cartão serial**. **[Confirmado]** (manual)
4. O rótulo `ESDUS_OUT_PIN2` / `ESDUS_IN_PIN1` combina com o leitor de cartão **ESD** (marca citada pela LG e pela Greenwald). **[Hipótese forte]**
5. **O protocolo serial (velocidade, formato, comandos) não é público.** Não achei documento da LG nem da ESD. **[Não encontrado]**
6. Existe prova de que terceiros conseguem entrar nessa serial: o **Greenwald Pay Plus** fica "no meio" entre a placa e o leitor ESD e libera máquina por celular. **[Confirmado]** (instalação Greenwald)
7. O “canal 100 a 1000” **não é protocolo da Cicclo**. No display de 4 dígitos, **R9PR = `r9Pr` = Regular Price** (preço de *vend*). O dono programa **SETUP → r9Pr → ALL → 100** (passos de 100). Cicclo, VMPay e Nayax só precisam **acertar esse preço na máquina**. **[Confirmado]** (dono + Master Book LG)
8. Nestas lojas o modelo é **Card/OPL**. O chicote certo da ESP32 é o de **cartão (serial, 6 fios, ~12,5 V + Tx±/Rx±)**, não o de moeda (pulso, 2 fios, ~16,5 V). **Ainda faltam pinagem pino a pino e bytes UART.** Sem isso, a ESP32 **não manda frames**. Plano B: pulso de moeda ou botão Start (seções 6 e 10).

---

## 1. O que as fotos mostram

Fotos: `docs/fotos-placa/` (8 imagens, já renomeadas). Nos nomes abaixo, o código de 8 caracteres era o início do nome original do arquivo; correspondência no fim desta seção.

### 1.1 Confirmado nas fotos
| Item | O que se vê | Foto |
|---|---|---|
| Placa de controle/painel | LG Electronics, **EAX61543618-1.0 "GIANT C PRO(WI-FI)"**, etiqueta **EBR8344 SY (KR)**, lote 260221 | `10d58729`, `eb847483`, `c9286ecc`, `d4331289` |
| Conector `ESDUS_OUT_PIN2` | Conector branco de **6 posições numeradas 1 a 6**; ao lado há serigrafia com **RX / TX** (sinais "+/−" aparecem cortados na foto) | `10d58729`, `eb847483` |
| Conector `ESDUS_IN_PIN1` | Conector pequeno branco à direita do OUT, com chicote colorido (verde-escuro, amarelo, laranja, rosa/vermelho, preto) | `eb847483` |
| Cabo preto no `ESDUS_OUT_PIN2` | Um cabo com capa preta entra no conector 6 pinos, com a ponta **coberta por resina/cola transparente** (parece emenda feita depois, não de fábrica) | `eb847483`, `10d58729` |
| Módulo Wi-Fi LG | Placa verde com etiqueta **EBR44895802**, **ML-48BK1510**, "Made in China", fica atrás do painel, ao lado do display | `31a7d794`, `e218d559`, `d4331289` |
| Fios do módulo Wi-Fi | **4 fios: azul, amarelo, marrom, preto**, em conector branco de 4+ posições, dentro de capa preta | `31a7d794` |
| Etiqueta "cicclo LAVADORA" | Etiqueta branca (logo + "LAVADORA") presa a um cabo/peça, perto de um conector branco-rosado com fios vermelho, laranja e amarelo | `75f76125` |
| Botões | Teclas de toque mecânicas (micro-chaves pretas) na parte de baixo da placa, 6 botões + display de 4 dígitos | `c9286ecc` |
| Pontos de teste | Furos/jumpers J26–J31, J37 e área "B2/25" (pontos de fábrica) | `dc2dbcc4`, `10d58729` |

**Correspondência código → arquivo em `docs/fotos-placa/`:**
- `10d58729` → `conectores-esdus-out-pin2-a.jpg`
- `eb847483` → `conectores-esdus-in-out-cabo-preto.jpg`
- `c9286ecc` → `placa-controle-botoes-e-etiqueta.jpg`
- `d4331289` → `placa-controle-e-modulo-wifi-cabo.jpg`
- `31a7d794` → `modulo-wifi-lg-fios-4-vias.jpg`
- `e218d559` → `modulo-wifi-lg-etiqueta.jpg`
- `75f76125` → `etiqueta-cicclo-lavadora-desfocada.jpg`
- `dc2dbcc4` → `pontos-de-teste-jumpers.jpg`

### 1.2 O que NÃO dá para concluir pelas fotos
- **Qual conector a Cicclo realmente usa.** A foto `75f76125` está desfocada, com luz vermelha, e a etiqueta cobre a placa. Não dá para dizer se o módulo Cicclo é uma placa separada ou só um cabo/etiqueta. **[Medir/Fotografar]**
- **Pinagem exata (função de cada pino 1–6).** A serigrafia legível só mostra RX/TX. Falta ver o que está impresso nos pinos 1, 2 (provavelmente 12,5 V e GND) e 3–6. **[Medir]**
- **Cores dos fios do cabo preto no OUT_PIN2.** A resina cobre quase tudo; só se vê um fio rosado/vermelho fino. **[Fotografar]**
- Pelo padrão visto, o cabo de 4 fios do Wi-Fi (azul/amarelo/marrom/preto) é típico de **alimentação + UART (TX/RX) + terra**. **[Hipótese]** Se esse cabo preto é o mesmo que entra no OUT_PIN2, então o Wi-Fi da LG ocupa esse conector. **Ainda é incerto**: o cabo preto visto em `d4331289` liga o módulo Wi-Fi à placa, mas não dá para ver em qual conector termina.

### 1.3 Quem é quem (hipótese de trabalho)
| Peça | O que parece ser | Confiança |
|---|---|---|
| LG EBR8344SY / EAX61543618 | Placa de **painel + controle** (display, botões, lógica do ciclo). É a placa "mestre" do ciclo. | Alta |
| Módulo EBR44895802 / ML-48BK1510 | **Módulo Wi-Fi/Bluetooth da LG** (serviço LG Smart Solution / Laundry Lounge). Aparece no manual: LED de Wi-Fi no painel. | Alta |
| "cicclo LAVADORA" | Interface de pagamento de terceiro. **Não inventa o “canal 100”**: esse número é o preço `r9Pr` da LG. O aparelho (Cicclo / VMPay / Nayax) só credita esse valor no conector de pagamento. | Média |
| ESDUS_IN / ESDUS_OUT | Entradas/saídas do **barramento do leitor de cartão ESD (versão US)**. | Média-alta |

Nota: a Cicclo **não** aparece no manual da LG. O caminho certo da ESP32 é o mesmo dos leitores de cartão/moeda da LG: **emular vend/card no conector**, não “falar o protocolo Cicclo”. **[Confirmado no sentido de programação; o fio elétrico ainda [Medir]]**

---

## 2. O que a LG e terceiros publicam (pesquisa)

### 2.1 Confirmado em fontes públicas
- **FAQ LG Business**: "É possível conectar sistemas centrais de pagamento? Sim, ligando ao chicote do painel de controle." Moeda aceita: Greenwald, ESD, Munzprufer. https://www.lg.com/global/business/commercial-laundry/faqs/
- **Conectores**: 2 conectores de 8 pinos, iguais por fora. Moeda: 2 fios (16,5 V vivo + terra). Cartão: 6 fios (12,5 V vivo, terra, Tx+/−, Rx+/−, "serial communication"). Mesma fonte. **A LG não publica o número de cada pino (1–8).**
- **Manual do dono (washer MFL71671218, modelos CWG27MDQRS/MDORS/MSORS/MSQRS/MDCRS/MSCRS)**: o MDCRS/MSCRS é "**Card/OPL type**". https://cdn.document360.io/3ba378f5-49bb-4d12-b998-373ae9b22725/Images/Documentation/Attachment%201.pdf
- **Modos de pagamento (manual)**: "PAY" (moeda/cartão) ou "FrEE" (OPL, uso interno sem pagamento). Em OPL a máquina mostra "PUSH" e o ciclo é iniciado pelos botões. Há configuração de **tipo de leitor de cartão** (0 = Greenwald, 1 = ESD) e de **pulso de moeda** (0 = 50 ms para ESD/Greenwald/Munzprufer, 1 = 100 ms Coreia) no manual do secador.
- **Modo de programação (senha padrão 3000)**: com cartão de serviço, ou botões 1º+3º ao mesmo tempo; 2º+3º alternam números; 4º avança; Start confirma. Permite preço, tipo de produto, tipo de leitor, diagnóstico. Há também "Cycle Kill Card" para encerrar ciclo.
- **`r9Pr` / R9PR = Regular Price** (preço padrão de *vend*). No Master Book da LG o atalho aparece escrito **`r9Pr`**. No display de 7 segmentos o `g` vira `9`. **ALL** aplica o mesmo preço a todos os ciclos (`COS1`…); preço por ciclo ganha do ALL. Tabela de país (`Loc1`): Coreia/Japão **0–9500 em passos de 100** — combina com o dono baixar de 1000 para 100. EUA é 0–9,95 em 0,05. Brasil **não** está nessa tabela pública. Fontes: [Master Book 2018 (passo a passo)](https://www.scribd.com/document/685096870/2018-LG-Commercial-Master-Book-V1-3-organized); [manual Giant-C / regular price](https://www.manualslib.com/manual/2706216/Lg-Fh069f4d.html?page=26); [secador RV1329 ALL/COS](https://www.manualslib.mx/manual/537798/Lg-Rv1329C1T.html?page=25); [manual GCWP1069](https://www.fowlercompanies.com/wp-content/uploads/2019/11/GCWP1069-Owners.pdf).
- **Greenwald Pay Plus**: dispositivo de terceiros que substitui o chicote do leitor ESD e fala **serial** com a placa da máquina; exige ativar "Serial Payment System" e uma chave DIP #3. Códigos de erro EC18/EC19 = "sem comunicação entre leitor e placa". Isso prova que **a serial do leitor ESD é "emulável" por terceiros**, mas Greenwald tem acordo comercial/documentação. https://greenwaldindustries.com/wp-content/uploads/2021/11/4104-002-3-ACA-ESD-cardreaders-install.pdf
- **Leitor serial ESD (Laundry Wizard)**: usa "protocolo de nível mais alto", 12 Vdc, lê chip, valida código do local, desconta saldo e **inicia a máquina**. https://laundrywizard.com/public/pdf/423_Serial%20Card%20Slides.pdf
- **API de nuvem da LG**: "LG Commercial Laundry API" (40+ endpoints: Device, Statistics, Store, Log, Callback/Webhook), com **NDA, contrato de API e chaves** (QA e OP). Passa pelo módulo Wi-Fi/servidor LG. https://www.lg.com/global/business/commercial-laundry/smart-laundry-lounge/
- Apps LG: "Laundry Lounge Installer" (cadastro, só para autorizados) e "Laundry Lounge" (monitoramento).

### 2.2 Não encontrei (e é importante dizer)
- Protocolo serial (baud, paridade, framing, checksum, comandos) entre placa LG e leitor ESD. **Não é público.** Não inventar bytes.
- Se a API de nuvem da LG tem **comando de iniciar/liberar ciclo** (só vi menção a remote control e a endpoints genéricos, sem lista pública).
- Manual de **serviço** (service manual) completo: não achei versão pública. Usei o manual do dono, que é público.
- Se o **MDCRS** tem o conector de **moeda** realmente ativo (a LG diz que existem 2 conectores, mas não diz se o de moeda funciona em modelo "Card").
- Código de país (`Loc1`) **desta** máquina no Brasil. O passo de 100 bate com Coreia/Japão na tabela pública; não achamos “Brasil” nessa lista.
- **Pinagem oficial pino 1–8** (qual pino é 12,5 V, GND, Tx+, Tx−, Rx+, Rx−). Só a lista de sinais, sem ordem. **[Não encontrado no owner/service/installation da LG]**
- Baud, paridade e frames UART do leitor ESD. **[Não encontrado]**
- Terceiro conector só de “central pay”: a FAQ manda ligar no **mesmo chicote do painel**. Não há pinagem extra. **[Confirmado o texto; sem diagrama]**

---

## 3. Como a máquina pode ser liberada por sinal externo (opções)

| # | Opção | Como funciona | Risco | Esforço | Situação |
|---|---|---|---|---|---|
| A | **Emular o leitor de cartão ESD (serial)** | ESP32 + transceptor diferencial **finge ser o leitor**. A máquina espera crédito **≥ r9Pr (100)**. Greenwald/Cicclo/Nayax fazem isso. | Alto: **ainda não temos os bytes**; erro pode travar a máquina | Alto (medir, depois implementar) | Protocolo **[Medir]** |
| B | **Pulso de moeda** | ESP32 + opto gera pulso (50 ms ESD/Greenwald/Munzprufer, ou 100 ms Coreia). Cada pulso soma o valor da moeda (`Co1`); o ciclo parte quando a soma ≥ **100**. | Médio: precisa do conector de moeda ativo no modelo Card e do tipo certo | Baixo | Viabilidade **[Medir]** |
| C | **Simular o botão Start** (modo OPL/FrEE) | Relé/optoacoplador em paralelo à micro-chave Start. Máquina fica em "PUSH"; cliente escolhe ciclo, nosso sistema só autoriza o Start. | Baixo-médio: a máquina não "cobra"; ciclo/preço são nossos. Precisa escolher ciclo por botões também | Baixo | Plausível; tecnicamente simples |
| D | **API de nuvem LG** | Backend chama API da LG | Médio: contrato, NDA, custo; depende de comando de start | Médio | Não sabemos se existe comando |
| E | **Manter a Cicclo** | Já funciona | – | – | Referência |

Avaliação honesta para **esta** loja (modelo Card): o caminho **A (serial no chicote de cartão)** é o que a LG e os kits de cartão descrevem. **B** só entra se existir o conector de 2 fios/16,5 V e o SETUP estiver em tipo moeda. **C** continua sendo o plano B mecânico. D só depende de contrato com a LG.

---

## 4. Riscos (leia antes de abrir qualquer máquina)

- **Choque elétrico (220 V).** Lavadora e secadora têm rede, motor, aquecedor e capacitores. A placa de painel pode ter **lógica ligada à rede (sem isolamento)**. Isso é comum em eletrodomésticos. **[Não confirmado]** Trate toda a placa como "energizada".
- **Capacitores carregados.** Aguarde alguns minutos após desligar e meça 0 V antes de tocar.
- **Instrumento ligado à terra.** Osciloscópio/analisador lógico no PC ligado na tomada podem criar curto pelo terra. Use **isolador USB**, notebook na bateria ou sonda diferencial.
- **Garantia LG.** Abrir painel, soldar na placa ou cortar chicote pode **anular a garantia**. Confirme o status de garantia de cada máquina antes.
- **Equipamento da Cicclo.** O módulo/cabo pode ser da Cicclo (comodato/contrato). **Não corte, não retire e não solde** nele antes de ler o contrato. Fotografe e marque tudo.
- **Segurança de pessoas e propriedade.** Máquina com água, porta travada e aquecedor: um comando errado pode iniciar com a porta aberta? (A trava da porta é da própria placa, mas não confie nisso para teste.) Teste com máquina vazia e sem água.
- **Risco jurídico/regulatório.** Instalação elétrica em equipamento comercial: peça a um técnico autorizado para a etapa invasiva, se possível.

---

## 5. O que ainda precisa ser medido (passos seguros)

Ordem: do menos arriscado ao mais. **Pare em qualquer dúvida.** Uma pessoa segura as sondas, outra fica fora do alcance do painel.

### Etapa 0 — Sem tocar na máquina (hoje)
1. Fotos novas, com boa luz e foco: (a) os dois conectores `ESDUS_OUT_PIN2` e `ESDUS_IN_PIN1` de frente e **a serigrafia completa** (todos os rótulos dos pinos); (b) o **lado de baixo** da placa nesses conectores (trilhas); (c) o dispositivo Cicclo inteiro, os dois lados, com etiquetas e modelo; (d) para onde cada cabo preto vai.
2. Registrar a **cor e a posição de cada fio** em cada conector (planilha, pino 1 a 6 e cores).
3. Verificar com a Cicclo: modelo do módulo, se é comodato, se há cláusula de exclusividade.
4. Entrar no SETUP **sem mudar preço** e anotar: `r9Pr` / ALL (hoje o dono usa **100**), PAY/FrEE, vend type (moeda/cartão), tipo de leitor (0 Greenwald / 1 ESD), valor da moeda (`Co1`), país (`Loc1`), firmware (`P0:CE`, `gF:XX`…). Só leitura, anote tudo.

### Etapa 1 — Máquina DESLIGADA da tomada (multímetro, continuidade)
5. Disjuntor desligado + plugue fora da tomada. Esperar 5 min.
6. Com o multímetro em **continuidade/ohm**, sem alimentação, mapear **qual pino do conector 1–6 liga a qual fio**. Marcar pino 1 (fio, cor).
7. Verificar se algum pino liga ao **terra da placa** (parafusos de fixação/GND).

### Etapa 2 — Máquina LIGADA, só medição de tensão em pino de conector (alto cuidado)
8. Máquina vazia, sem água. Ligar. Medir **tensão DC** entre pinos (preto no GND, vermelho em cada pino), **sem encostar em mais nada**, com ponteiras isoladas. Esperado: ~**12,5 V** em um pino (leitor de cartão) e níveis de sinal nos demais. **[Hipótese pela LG]**
9. Medir **com o Cicclo ligado** e depois **com ele desconectado** (só se o contrato permitir). Compare: o que muda?
10. Medir a tensão **entre GND da placa e o terra do plugue** (use multímetro em AC e DC). Se houver tensão AC significativa, a lógica **não é isolada**: use isolamento em todo o resto.

### Etapa 3 — Analisador lógico / osciloscópio (com isolamento)
11. **Isolador USB** no analisador, ou notebook na bateria, sem outro aparelho aterrado ligado.
12. Capturar, com ponta de prova nos **pinos RX/TX**, 1) máquina em espera, 2) após liberar pelo app da Cicclo, 3) durante o ciclo, 4) ao final. Para sinal diferencial (Tx+/Tx−): medir **cada lado contra GND**, ou usar analisador com canal diferencial/transceptor RS-422.
13. Descobrir: **velocidade (baud)**, formato (8N1?), quadros periódicos ("heartbeat"), e o quadro que vem **exatamente quando a máquina é liberada**. Comparar liberações de preços/cursos diferentes.
14. Repetir em **outra máquina** (secadora RV1329C7P) para ver o que é igual e o que muda.
15. Salvar capturas brutas (`.sal`, `.csv`) em `internal/` para análise.

### Etapa 4 — Teste de escrita (só depois de entender tudo, e com aprovação)
16. Só então tentar mandar quadros da ESP32 na bancada (placa de teste ou máquina sem carga). Nunca com a Cicclo e a ESP32 transmitindo **ao mesmo tempo** no mesmo barramento.

### Perguntas para fornecedor
- À **Cicclo**: protocolo, ou aceita nos dar uma liberação "manual" para teste?
- À **LG Brasil (B2B comercial)**: documentação do conector de pagamento serial, API de nuvem, "central payment", "canais".
- À **ESD / Greenwald**: protocolo serial (provavelmente sob NDA).

---

## 6. Plano de firmware ESP32 (sem código final)

### 6.1 Princípios
- **Falhar para o lado seguro**: na dúvida, não liberar.
- **Isolar** a ESP32 da placa da máquina (optoacoplador/transceptor isolado). Não depender de a lógica da LG ser isolada.
- Tudo configurável por **perfil** (opção A, B ou C), para o mesmo hardware atender cenários diferentes.

### 6.2 Hardware sugerido (ainda depende das medições)
| Bloco | Sugestão | Observação |
|---|---|---|
| MCU | ESP32 (WROOM-32E ou S3) | Wi-Fi 2,4 GHz, UART livre, NVS |
| Alimentação | Fonte própria 5 V (USB/12 V→5 V) | **Não** alimentar da placa LG até medir corrente do pino de 12,5 V |
| Serial diferencial (opção A) | **Transceptor RS-422/485 3,3 V** (full duplex: Tx± e Rx±), preferencialmente **isolado** | Só se a medição mostrar nível diferencial. Se for TTL 3,3/5 V, usar *level shifter* |
| Pulso de moeda (opção B) | Optoacoplador (ex.: PC817) ou relé de estado sólido de baixa tensão | Saída em coletor aberto, 50 ms |
| Start (opção C) | Optoacoplador/relé em paralelo à micro-chave Start | Sem componentes de rede (220 V) |
| Proteção | TVS, fusível de baixa corrente, resistor de série | Entre ESP32 e fios da máquina |
| Placa | PCB própria com conectores rotulados (pino 1) | Evitar fio solto no protótipo final |

### 6.3 Pinos (rascunho, ESP32-WROOM; ajustar ao modelo)
| Função | GPIO (sugestão) | Notas |
|---|---|---|
| UART2 TX → transceptor DI | 17 | Serial para a máquina |
| UART2 RX ← transceptor RO | 16 | |
| Direção (DE/RE) | 4 | Só se meio-duplex. Em full duplex RS-422, não precisa |
| Saída Start/Moeda (opto) | 25 | Nível alto = ativo, com pull-down externo |
| Entrada "máquina ocupada" (se existir) | 34 | Só entrada |
| LED de estado | 2 | Online / liberando / erro |
| Botão de manutenção | 0 / 27 | Evitar GPIO de boot nas funções críticas |
**Cuidado:** GPIO 0, 2, 12, 15 (strapping) devem ter nível definido no boot. Saída de liberação **sempre em estado "desligado" no boot** (pull-down) para a máquina não iniciar ao ligar.

### 6.4 UART (opção A)
- Perfil de UART (baud, bits, paridade, parada) vem das medições. Hoje **desconhecido**.
- Camadas: (1) driver UART com FIFO e *timeouts* de quadro; (2) *parser* de quadros (início/fim/checksum); (3) máquina de estados do **leitor virtual** (inicialização, ocioso, crédito **≥ r9Pr**, ocupado, erro); (4) comando “liberar” = **creditar o preço de vend** (hoje 100), não um “canal Cicclo”. **Não há quadro serial conhecido** — o stub do firmware continua vazio de propósito.
- **Modo escuta (sniffer)** primeiro: firmware que **apenas grava** o tráfego e envia por MQTT/serial USB para análise. Isso reduz risco antes de transmitir.
- *Watchdog* e reinício limpo: se o barramento ficar mudo por N segundos, entrar em estado de erro e avisar o backend.

### 6.5 Rede e MQTT
- Cliente MQTT sobre **TLS (8883)**, ID estável por placa (ex.: `loja-<id>/maq-<id>`), usuário/senha ou certificado por placa.
- Tópicos (rascunho):
  - `lav/<loja>/<maq>/cmd` (assina, QoS 1): comandos de liberação.
  - `lav/<loja>/<maq>/ack` (publica): confirmação com o mesmo `commandId`.
  - `lav/<loja>/<maq>/state` (publica, retido): online/ocupada/erro, versão do firmware, RSSI, uptime.
  - LWT em `.../state` = `offline`.
- Comando (campos): `commandId`, `issuedAt`, `expiresAt` (30–60 s), tipo (curso/crédito), valor. Resposta: `received`, `executed` ou `rejected(motivo)`.
- Idempotência: guardar os últimos `commandId` em **NVS**; repetido → não executa, responde `executed` de novo (já definido no plano técnico, seção 2.6).
- Relógio: sincronizar por **SNTP**; se o relógio estiver errado, **rejeitar** comandos (não confiar em `expiresAt`) ou usar janela relativa.

### 6.6 Segurança
- **Nunca** aceitar comando sem TLS e sem autenticação. ACL por tópico: a placa só lê/escreve o próprio.
- Opcional: assinatura HMAC do comando com chave por placa (defesa extra se o broker for comprometido).
- **Secure boot e criptografia de flash** da ESP32 (evitar extração de credenciais), desativar JTAG/UART de debug em produção.
- **OTA assinado** (rollback automático se não voltar online), em janela de manutenção, nunca durante ciclo.
- Credenciais em NVS criptografada, provisionamento por placa (sem senha única global).
- Limite de taxa: máximo N liberações por minuto por máquina; **modo manutenção** que bloqueia comandos remotos.
- Registrar localmente eventos recentes (buffer circular) para auditoria.

### 6.7 Estados e proteção operacional
- Estados: `BOOT → ONLINE_IDLE → CMD_RECEBIDO → LIBERANDO → AGUARDANDO_INICIO → OCUPADA → FIM/ERRO`.
- Confirmar que a máquina **de fato iniciou** (mudança no barramento ou entrada de "ocupada") antes de mandar `executed`. Se não confirmar, `unconfirmed` (o backend decide estorno/liberação manual).
- Se perder Wi-Fi/MQTT: **não liberar** nada novo; manter estado local e reconectar com *backoff*.

### 6.8 Plano de fases do firmware
1. **Fase 0 — Sniffer**: só escuta e registra (nenhuma escrita). Valida pinagem e sinais.
2. **Fase 1 — Bancada**: libera uma máquina de teste vazia, sem Cicclo, com o perfil escolhido (A, B ou C).
3. **Fase 2 — Loja piloto**: 1 máquina, supervisionada, ao lado do sistema atual.
4. **Fase 3 — Escala**: lojas restantes, OTA, métricas.

---

## 7. Decisões e próximos passos

1. **Pedir** à Cicclo/LG/ESD o protocolo e confirmar contrato (em paralelo).
2. Executar **Etapas 0 e 1** (sem risco de choque) e mandar as fotos novas.
3. Só depois, **Etapas 2 e 3** com técnico e isolamento.
4. Escolher entre A, B e C **com dados medidos**. Se tudo falhar, **opção C (Start por relé)** é viável.
5. Comprar um **kit de bancada**: ESP32, transceptor RS-422 isolado, optoacopladores, isolador USB, analisador lógico de 8 canais.

## 8. Resumo de incertezas

| Pergunta | Estado |
|---|---|
| O conector de cartão tem Tx±/Rx± e 12,5 V? | Confirmado pela LG (FAQ) |
| ESDUS_OUT/IN é o conector do leitor ESD? | Hipótese forte |
| A Cicclo usa essa serial? | Hipótese (não visto de forma clara nas fotos) |
| Níveis elétricos (RS-422? TTL?) | Não medido |
| Baud e protocolo | Desconhecido |
| Pinagem pino 1–8 (cartão e moeda) | **Não publicada pela LG** |
| “Canal” 100–1000 | **É o preço `r9Pr` da LG**, passos de 100. Não é protocolo Cicclo. **[Confirmado]** |
| Chicote desta loja (Card) | **Serial de cartão** (FAQ + tipo MDCRS). Pulso = **outro** conector. **[Confirmado o tipo; pinos [Medir]]** |
| API de nuvem LG tem comando de iniciar? | Desconhecido |
| Pulso de moeda funciona no modelo Card? | Desconhecido |
| Lógica da placa é isolada da rede? | Desconhecido (assumir que não) |

---

## 9. Programação do dono: SETUP → R9PR → ALL → 100

Máquinas desta loja: lavadora **LG Giant-C Max Washer CWG27MDCRS.ASSGBRS (FH069FD6F)** e secadora **Dryer CDG27MUCES.ASSGBRS (RV1329C7P)**. Painel **EBR8344SY / EAX61543618**. Conector **ESDUS** com RX/TX.

### 9.1 O que o dono faz no painel
1. Entra em **SETUP** (modo de programação). Caminhos oficiais: cartão de serviço (tipo cartão); chave do cofre de moeda (tipo moeda); ou, em todos os tipos recentes, **1º+3º juntos → 2º três vezes → Start** (senha padrão **3000** em alguns painéis).
2. Vai até **R9PR** (`r9Pr` no Master Book = Regular Price).
3. Escolhe **ALL** (o mesmo preço para todos os ciclos).
4. Desce o valor de **1000 para 100** (botão que diminui; o passo é **100**).
5. Confirma com **Start**.

Cicclo, VMPay e Nayax pedem essa mesma programação: a **máquina** fica com vend **100**; o leitor só precisa creditar **100**.

### 9.2 O que R9PR e o 100 significam
| Termo | Significado |
|---|---|
| **R9PR / `r9Pr` / `rgPr`** | Preço regular de *vend*: quanto a máquina exige para liberar o ciclo. Não é frequência de rádio, não é ID de protocolo Cicclo. |
| **ALL** | Copia esse preço para todos os cursos (`COS1` quente, `COS2` morno, etc.). Preço individual de um COS **vence** o ALL. Na secadora, o Master Book diz que todos os cursos usam o preço regular. |
| **100** | Unidade de preço no painel. Com passo de 100 (tabela Coreia/Japão: 0–9500), a escala visível é 0, 100, 200, … 1000, … Não é “canal 1” da Cicclo. |
| **1000** | Outro valor possível na **mesma** escala (ex.: dez vezes o preço, ou dez pulsos se a moeda valer 100). O dono **abaixa** para 100 = **um crédito / um ciclo**. |
| **Moeda** | Cada pulso soma `Co1` (valor da moeda 1). O ciclo começa quando a soma ≥ `r9Pr`. Se `Co1` = 100 e `r9Pr` = 100, **um pulso** libera. |
| **Cartão / sistema central** | O leitor manda crédito (em geral na serial ESD). A máquina compara com `r9Pr`. Crédito **100** libera o ALL. |

O dinheiro real (reais no app) **não** precisa ser 100. O 100 é só a conta interna da LG. O nosso backend cobra em reais; a ESP32, no fio, precisa entregar **crédito 100** (ou um pulso equivalente).

### 9.3 O que isso muda para a ESP32
- **Fazer:** ocupar o lugar do leitor/moedeiro no conector da **LG** (`ESDUS` e/ou moeda) e creditar **100** quando o MQTT mandar liberar.
- **Não fazer:** procurar um “protocolo Cicclo”. Cicclo, VMPay e Nayax são só clientes desse *vend* da LG.
- **Sinal no chicote de cartão:** serial (Tx±/Rx±), não pulso de moeda. O pulso (50 ms) é o **outro** conector, de 2 fios. Sem osciloscópio ainda **não** sabemos tensão real nem baud. Sem frames: o driver serial **não envia bytes**.
- O campo `channel` 100–1000 no MQTT/firmware deve ser lido como **preço de vend**, em passos de 100, não como canal de rádio.

### 9.4 O que continua em aberto
- UART diferencial vs TTL (a FAQ fala Tx+/Tx−, Rx+/Rx− — isso **parece** diferencial, mas não foi medido).
- Baud, formato e qualquer comando serial.
- Qual pino 1–6 do `ESDUS_OUT_PIN2` é cada sinal.
- Se o modelo Card desta loja ainda aceita pulso de moeda.
- `Loc1` (país) gravado nestas placas.

## 10. Chicote de pagamento (cartão vs moeda vs central) — o que plugar

Pesquisa em FAQ LG Commercial, owner Giant-C (MFL71671218 / CWG27MDCRS Card/OPL), owner/secador RV1329, Master Book 2018, e guias de terceiros (Greenwald Pay Plus LG, Laundroworks serial, Airwallet Giant-C, PayRange C5). **Nenhum manual de serviço público mostrou o esquema pino a pino.**

### 10.1 Três nomes, dois conectores

A LG descreve **dois** conectores de **8 pinos, iguais por fora**, no chicote do painel. “Central Payment System” **não** ganha um terceiro conector: a FAQ manda ligar **no mesmo chicote**.

| Nome | Como reconhecer | Sinais publicados | Como a máquina cobra `r9Pr` |
|---|---|---|---|
| **Cartão / leitor ESD** | **6 fios** no conector de 8 pinos | **12,5 V** vivo, terra, **Tx+ Tx− Rx+ Rx−** (“serial communication”) | Crédito serial ≥ preço (hoje 100) |
| **Moeda / coin drop** | **2 fios** no outro conector de 8 pinos | **16,5 V** vivo e terra | Pulso: tipo `Cndr` **0 = 50 ms** (ESD, Greenwald, Munzprufer) ou **1 = 100 ms** (Coreia). Cada pulso soma `Co1` |
| **Pagamento central** | Mesmo chicote do painel | **Não publicado à parte** | Terceiros usam **serial de cartão** (Greenwald, Laundroworks) **ou** pulso de moeda (Airwallet). A LG não diz qual |

Nesta loja: lavadora **CWG27MDCRS / FH069FD6F = Card/OPL**. Painel com serigrafia **`ESDUS_OUT_PIN2` / `ESDUS_IN_PIN1`** e RX/TX. Isso é o caminho de **cartão serial**, não o de moeda. Secadora **CDG27MUCES / RV1329C7P**: mesma família Giant-C; a FAQ de conectores é a mesma. O código **CDG27MUCES** não apareceu no owner que abri (vi CDG27R* card type); trate como Giant-C até conferir o painel.

**“MDC”:** no código **CWG27MDCRS**, **C** = tipo cartão (manual: Card/OPL). **Não** é o controle Alliance/Speed Queen chamado MDC (pulso de start de outra marca). Não use pinagem Alliance nesta máquina.

### 10.2 Pinagem — o que é público e o que não é

**A LG não numerou os pinos 1–8.** Só listou os sinais.

O que dá para usar na prática:

| Pino / fio | Cartão (6 fios) | Moeda (2 fios) | Fonte |
|---|---|---|---|
| Vivo | ~**12,5 V** | ~**16,5 V** | FAQ LG |
| Terra | GND | GND | FAQ LG |
| Dados | Tx+, Tx−, Rx+, Rx− | (não há) | FAQ LG |
| Pulso | (não há) | o par vivo/GND (o drop “abre/fecha” o pulso) | Owner: Coin Drop Type 50/100 ms |

Terceiros (não é manual LG; **não copiar cego**):

- Airwallet no Giant-C (caminho **moeda**): PIN **6** vermelho/laranja e PIN **4** marrom no conector de coin drop. O chicote Airwallet ainda tem fios **1 e 2 = 100–240 V CA** — isso é alimentação do **leitor Airwallet**, não da ESP32. **Nunca ligue esses fios na ESP32.**
- Laundroworks: cabo de **6 fios** no conector **preto atrás do display**, máquina em **Vend = Card / Pay**.
- Greenwald Pay Plus (kit LG 4116-001): entra **no chicote do leitor de cartão** (serial), no meio entre placa e leitor.
- PayRange C5 (controlador “C-series”, outro desenho de conectores): pulso no e-Suds **ou** serial no “6-wire 8-pin”. Só como prova de que as duas vias existem na família LG; **não** é o diagrama do EBR8344SY.

Fotos desta loja: `ESDUS_OUT_PIN2` é branco de **6 posições**. Combine com o conector de **cartão**. A ordem 1–6 na serigrafia **ainda precisa de foto nítida + continuidade**.

### 10.3 O que plugar / o que não plugar (ESP32)

A máquina **já tem chicote** esperando o cabo (plug-in). Esse chicote, no modelo Card, é o de **leitor**. A ESP32 **não** vai nele direto: 12,5 V e serial diferencial **queimam** GPIO 3,3 V.

| Fazer | Não fazer ainda |
|---|---|
| Identificar o conector de **6 fios / ESDUS** (cartão) | Ligar **220 V**, motor, aquecedor ou qualquer fio de rede na ESP32 |
| Com a máquina **desligada da tomada**, mapear pino × cor × continuidade até GND | Ligar **12,5 V** ou **16,5 V** em GPIO, RX, TX ou 3V3 |
| Só depois, **medir tensões** nos pinos (preto no terra da placa) | Cortar ou soldar o módulo Cicclo sem ler o contrato |
| Gravador: ambiente **`esp32doit-serial`** (só escuta), transceptor **isolado** RS-422/485, **só RX** no início | Inventar bytes UART ou ligar TX na máquina |
| USB 5 V na ESP32 (fonte **própria**) | Alimentar a ESP32 pelo 12,5 V da LG sem medir corrente |
| GPIO/opto só se for o **conector de moeda** (2 fios) e SETUP em tipo moeda; pulso **50 ms** | Usar pulso de 500 ms (não é o valor da LG) nem o chicote Airwallet com 220 V |

### 10.4 Firmware agora: muda código de liberação? **Não**

Os manuais **separam** pulso de moeda e serial de cartão. O driver padrão **desta loja** é o **serial (sniffer)**. Isso **já existe**. O que **não** existe (e o manual não entrega) são os **bytes**. Por isso:

- **Não** implementar `buildReleaseFrame()`. Continua recusando com `serial_protocol_unknown`.
- Baud **9600 8N1** no `platformio.ini` é **chute de compilação**, não dado da LG. Ajuste só depois de medir.
- O driver GPIO (opto, GPIO **26**) fica como plano B de **moeda/Start**. Duração padrão alinhada ao manual: **50 ms** (`Cndr` = 0).

Próximo passo seguro: **Etapa 1 da seção 5** (tomada fora, continuidade). Só então tensões. Só então sniffer. TX/crédito só com captura e aprovação.
