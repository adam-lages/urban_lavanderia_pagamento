# Guia HML — Firmware ESP32 (placa)

## Como gravar o código na ESP32 (jeito mais fácil)

**Recomendado: PlatformIO dentro do VS Code ou do Cursor.** O projeto já está configurado; é mais simples que o Arduino IDE.

1. Instale o VS Code (ou Cursor) e a extensão **PlatformIO IDE**.
2. No terminal: `git checkout dev && git pull`.
3. Abra a pasta `firmware/` no editor.
4. Confira `firmware/include/secrets.h`:
   - Wi-Fi (`WIFI_SSID`): `Urban_Lavanderia_Setup`
   - `MQTT_HOST`: o **IP do PC na rede** (onde roda o broker)
   - porta MQTT: `1883`
5. Conecte a placa com um cabo USB de **DADOS** (cabo só de carga não funciona).
6. Grave: `pio run -e esp32doit-mock -t upload`
7. Monitor serial: `pio device monitor`

**Dica:** se falhar em `Connecting...`, segure o botão **BOOT** da DOIT DevKit até o upload começar.

### Rede Wi-Fi das placas

| Item | Valor |
| --- | --- |
| Nome (SSID) | `Urban_Lavanderia_Setup` |
| Senha | `@Hoje123@` |
| Onde alterar | `firmware/include/secrets.h` |
| Porta MQTT | `1883` |
| `MQTT_HOST` | **IP do PC na rede** (onde roda o broker), não `localhost` |

> Aviso: a senha está visível aqui de propósito (repositório **privado**, autorizado pelo dono). Se o repositório virar público, **troque a senha** do Wi-Fi.

> Nota: o caminho pelo Arduino IDE existe em [`COMO-GRAVAR.md`](COMO-GRAVAR.md), mas é mais trabalhoso e esse passo a passo **não foi testado**. Para detalhes de gravação, veja esse arquivo.

Este arquivo explica as **configurações** da placa e como elas devem evoluir.  
Para **gravar** o programa na ESP32 (passo a passo, Arduino IDE e PlatformIO), use **[`COMO-GRAVAR.md`](COMO-GRAVAR.md)** — este guia não substitui aquele.

## O que é este projeto

Cada máquina (lavar ou secar) terá **uma** placa ESP32 DOIT DevKit V1. A placa entra no Wi-Fi da loja, conversa com o nosso servidor por MQTT e, quando chega o recado “liberar”, aciona a máquina.

Hoje existem três “modos” (drivers), escolhidos na hora de gravar:

| Modo (ambiente PlatformIO) | O que faz |
| --- | --- |
| `esp32doit-mock` | Só pisca o **LED azul** da placa quando chega “liberar” (3 piscadas + ~2 s aceso). Comece sempre por aqui. |
| `esp32doit-serial` | **Chicote de cartão (ESDUS).** Só **escuta** a serial. Ainda **não** libera: a LG não publica os bytes. O “canal 100” é o **preço `r9Pr`**, não protocolo Cicclo |
| `esp32doit-gpio` | Plano B: pulso **50 ms** no GPIO 23 (opto) = moeda ou Start — **não** ligue 220 V, 16,5 V nem 12,5 V na ESP32 |

O ID da placa é `esp-` + o MAC (aparece no monitor serial). Tópicos MQTT: `lav/<id>/cmd`, `ack`, `status`, `info`.

## Como “rodar” no computador / na placa (passos iniciais)

**Isto não é um projeto npm.** Não rode `npm install` nem `yarn` nesta pasta. Não há `package.json` no firmware.

O código é C++ para **ESP32**, com **PlatformIO** (caminho principal) ou **Arduino IDE**. O passo a passo completo de gravação, USB, botão BOOT e modo mock está em **[`COMO-GRAVAR.md`](COMO-GRAVAR.md)** — use aquele arquivo para gravar. Aqui vai só o essencial para não ficar perdido.

### O que precisa ter

- Uma placa **ESP32 DOIT DevKit V1** e cabo USB.
- **PlatformIO** (`pip install platformio`, ou a extensão no VS Code) **ou** Arduino IDE 2 (mais trabalhoso; detalhes em `COMO-GRAVAR.md`).
- Wi-Fi que a placa alcance (SSID/senha em `include/secrets.h`).
- Backend no ar **na mesma rede** (veja `apps/backend/HML.md`). No computador, `npm run dev:backend` já sobe o MQTT na porta 1883 — **não precisa de Docker**. Na placa, **não use `localhost`** como MQTT: `localhost` na ESP32 é ela mesma. Use o IP do PC.

Para testar o **contrato** sem placa: na raiz do repo, `npm run dev:simulator` (isso é Node, mas é o simulador em `apps/simulator`, não este firmware).

### Passos curtos (PlatformIO, modo mock = só o LED)

1. Leia os avisos de 220 V em `COMO-GRAVAR.md` e no `README.md` desta pasta. Primeiro teste: **só USB**, sem fio na máquina.
2. Confira Wi-Fi e MQTT em `firmware/include/secrets.h` (`WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_HOST` = IP do PC, porta **1883**).
3. Grave o mock:

```bash
cd firmware
pio run -e esp32doit-mock -t upload
pio device monitor
```

4. No serial (115200) aparece o ID (`placa esp-…`). No dashboard, menu **Máquinas**, cadastre quando ficar **Online** e teste **Liberar** (o LED azul deve piscar 3 vezes e ficar aceso ~2 s).

Arduino IDE: mesma ideia (placa DOIT ESP32 DEVKIT V1, bibliotecas PubSubClient e ArduinoJson) — siga a seção 4 de `COMO-GRAVAR.md`. Prefira PlatformIO neste repo (`platformio.ini`).

### Deu errado?

| Sintoma | O que checar |
| --- | --- |
| `npm install` aqui | Pasta errada. Firmware não usa npm. |
| `pio: command not found` | Instale PlatformIO (`pip install platformio` ou a extensão). |
| `Connecting...` e não grava | Segure o botão **BOOT** na placa; confira cabo/driver CP2102 ou CH340; no Linux, grupo `dialout`. |
| Wi-Fi não conecta | SSID/senha em `secrets.h` e **grave de novo**. A rede precisa ser 2,4 GHz (ESP32 clássica). |
| MQTT / placa offline no dashboard | `MQTT_HOST` tem que ser o IP do PC na LAN, não `localhost`. O backend Node já escuta MQTT na porta 1883. PC e placa na mesma rede Wi-Fi. Só o dashboard (sem placa) funciona com esse broker local. |
| Liberar não acende o LED | Backend no ar? Token no dashboard? Gravou o ambiente `esp32doit-mock`? |

Arquivos de configuração (pode editar estes; o pedido deste guia é **não** mudar o restante do firmware):

- `include/secrets.h` — SSID, senha Wi-Fi, IP e porta do MQTT
- `include/secrets.example.h` — modelo sem senha real
- `include/config.h` — pinos, tempos, baud da serial (padrões)
- `platformio.ini` — qual driver gravar e alguns `build_flags`

O backend precisa estar acessível **na mesma rede** Wi-Fi. Na ESP32, **não use `localhost`** como MQTT: `localhost` na placa é ela mesma.

## O que dá para configurar HOJE

### Wi-Fi e MQTT (`include/secrets.h`) — valores atuais no repo

| Define | Significado | Valor atual |
| --- | --- | --- |
| `WIFI_SSID` | nome da rede | `Urban_Lavanderia_Setup` |
| `WIFI_PASSWORD` | senha da rede | `@Hoje123@` |
| `MQTT_HOST` | IP do computador/servidor com o Mosquitto | `192.168.0.10` |
| `MQTT_PORT` | porta MQTT | `1883` |
| `MQTT_USER` | usuário MQTT | vazio |
| `MQTT_PASS` | senha MQTT | vazio |
| `MQTT_USE_TLS` | MQTT com cadeado | `0` (desligado) |

Esses valores estão versionados porque o repositório é **privado**. Não publique o repo sem trocar Wi-Fi e senhas. Não há token Stone nem senha LG neste firmware.

### Driver GPIO (`platformio.ini` + `config.h`)

| Item | Atual |
| --- | --- |
| Pino | GPIO **23** (`GPIO_RELEASE_PIN`) |
| Nível ativo | `HIGH` (`GPIO_ACTIVE_LEVEL`; use `LOW` em relé “ativo em baixo”) |
| Duração do pulso | **50** ms (`GPIO_PULSE_MS`; Coin Drop Type 0 da LG; permitido 20–5000) |

### Driver mock

LED azul onboard no GPIO **2**. Ao receber “liberar”: **3 piscadas rápidas** (150 ms acende / 150 ms apaga) e depois **~2 s aceso**; então apaga e a placa responde “feito” ao servidor. Não trava o Wi-Fi/MQTT. Ajustes em `config.h`: `CMD_BLINKS`, `CMD_BLINK_MS`, `CMD_HOLD_MS`.

**LED RGB externo (ativo por padrão)**: pinos R=25, G=26, B=27 e `RGB_COMMON_ANODE 0` (cátodo comum) em `secrets.h`. Material: LED RGB 5 mm cátodo comum + 3 resistores 220 Ω (cada cor em série; perna longa no GND). Azul piscando devagar = conectando; azul fixo = conectado; verde (3 piscadas rápidas + ~2 s fixo) = comando recebido; vermelho = sem Wi-Fi/MQTT ou comando falhou/expirou. Para ânodo comum: perna longa no 3V3 e `RGB_COMMON_ANODE 1`. Não ligue nada à máquina LG. Sem RGB ligado, o LED azul da placa segue igual. Ligação detalhada em `COMO-GRAVAR.md`. Obs.: o plano B `esp32doit-gpio` agora usa o GPIO 23 (era 26) para não colidir com o verde.

**Como confirmar que o LED reage**: veja a seção “Teste do Liberar” em `COMO-GRAVAR.md`.

### Driver serial (sniffer)

| Item | Atual |
| --- | --- |
| RX | GPIO **16** |
| TX | GPIO **17** (só se ligar envio de debug) |
| Baud | **9600** (chute; a LG **não** publica) |
| Formato | `SERIAL_8N1` |
| Envio de bytes para a máquina | `SERIAL_DEBUG_TX=0` (desligado — deixe assim) |

Monitor serial do computador: **115200**. Firmware marcado como versão `0.1.0` no `platformio.ini`.

No computador, o MQTT de desenvolvimento sobe **junto com o backend** (`npm run dev:backend`), porta 1883, sem senha. A placa precisa alcançar o **IP do PC** nessa porta. O IP `192.168.0.10` em `secrets.h` só funciona se for realmente o IP atual do PC. Docker/Mosquitto é opcional. Para testar **só o dashboard**, o broker local basta — ESP32 de verdade precisa do IP na LAN.

## O que a máquina espera (programação do dono)

No painel LG o dono faz **SETUP → R9PR (`r9Pr`) → ALL → 100** (desce de 1000 de 100 em 100). Isso é o **preço de vend** de todos os ciclos, documentado pela LG. Cicclo / VMPay / Nayax só pedem que a máquina fique nesse preço.

A ESP32 precisa **emular o leitor no chicote de cartão** até a máquina ver crédito **≥ 100**. Não é “falar com a Cicclo”.

**O que plugar:** o chicote de **cartão** (6 fios / `ESDUS`, serial Tx± Rx±, ~12,5 V). É o que a máquina Card/OPL já deixa pronto (plug-in). Use transceptor isolado; na primeira vez **só RX + GND medido**. Ambiente `esp32doit-serial`.

**O que NÃO plugar ainda:** **220 V**; vivo de **12,5 V** ou **16,5 V** nos pinos da ESP32; TX da ESP32 na máquina; chicote de terceiro com Line/Neutral (ex.: Airwallet fios 1–2).

**Próximo passo seguro:** máquina **desligada da tomada**, mapear pino × cor (continuidade). Só depois medir tensões. Só depois escutar. Sem bytes capturados, **não** inventar UART. Detalhe em `docs/analise-placa-e-protocolo.md` (seções 9 e 10).

## Passos futuros (planejados)

- MQTT com TLS (`MQTT_USE_TLS 1`, certificado `MQTT_CA_CERT`, em geral porta 8883) e usuário/senha por placa
- **Medir** pinos e níveis no ESDUS. O sniffer só publica hex em `lav/<id>/debug/rx`. **Não inventar quadro serial.**
- Só então um driver que **credite 100** no serial (ou pulsos no conector de moeda, se existir), com isolamento (3,3 V da ESP32 ≠ 12,5 V / 16,5 V / RS-422)
- Relógio e rede estáveis nas lojas reais (NTP já é exigido para aceitar comando)

## Como fazer uma mudança pequena com segurança

**Trocar o Wi-Fi**

1. Edite `WIFI_SSID` e `WIFI_PASSWORD` em `include/secrets.h`.
2. Grave de novo o firmware (senão a placa continua na rede antiga). Veja `COMO-GRAVAR.md`.
3. Confira no monitor serial se conectou. Depois veja **Online** em Máquinas no dashboard.

**Trocar o servidor MQTT**

1. Coloque em `MQTT_HOST` o IP **atual** do PC/servidor (não `localhost`).
2. Mantenha a porta 1883 enquanto o MQTT de desenvolvimento estiver sem TLS.
3. Grave de novo. Se o dashboard não mostrar a placa, o IP ou o Wi-Fi está errado — não é credencial Stone.

**Adicionar uma máquina**

1. Grave **outra** ESP32 (cada uma ganha ID pelo MAC).
2. Cadastre no dashboard quando aparecer online.
3. Só passe do mock para **serial (sniffer)** com transceptor isolado, ou GPIO/opto no conector de **moeda**, **sem** 220 V nos pinos da ESP32.

Não apague `COMO-GRAVAR.md`. Não ligue a placa na rede elétrica da máquina neste estágio.
