# Guia HML — Firmware ESP32 (placa)

Este arquivo explica as **configurações** da placa e como elas devem evoluir.  
Para **gravar** o programa na ESP32 (passo a passo, Arduino IDE e PlatformIO), use **[`COMO-GRAVAR.md`](COMO-GRAVAR.md)** — este guia não substitui aquele.

## O que é este projeto

Cada máquina (lavar ou secar) terá **uma** placa ESP32 DOIT DevKit V1. A placa entra no Wi-Fi da loja, conversa com o nosso servidor por MQTT e, quando chega o recado “liberar”, aciona a máquina.

Hoje existem três “modos” (drivers), escolhidos na hora de gravar:

| Modo (ambiente PlatformIO) | O que faz |
| --- | --- |
| `esp32doit-mock` | Só acende o **LED** da placa (~1,5 s). Comece sempre por aqui. |
| `esp32doit-gpio` | Pulso num pino (padrão GPIO 26) para optoacoplador/relé — **não** ligue 220 V na ESP32 |
| `esp32doit-serial` | Só **escuta** a serial da máquina (sniffer). Ainda **não** libera, porque o protocolo LG/Cicclo é desconhecido |

O ID da placa é `esp-` + o MAC (aparece no monitor serial). Tópicos MQTT: `lav/<id>/cmd`, `ack`, `status`, `info`.

## Como rodar / onde mexer

1. Leia os avisos de 220 V em `COMO-GRAVAR.md` e no `README.md` desta pasta.
2. Confira Wi-Fi e MQTT em `firmware/include/secrets.h`.
3. Grave o modo mock (comandos em `COMO-GRAVAR.md`).
4. No dashboard, menu **Máquinas**, cadastre a placa quando ela ficar **Online** e teste **Liberar** (o LED deve acender).

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
| Pino | GPIO **26** (`GPIO_RELEASE_PIN`) |
| Nível ativo | `HIGH` (`GPIO_ACTIVE_LEVEL`; use `LOW` em relé “ativo em baixo”) |
| Duração do pulso | **500** ms (`GPIO_PULSE_MS`; permitido 20–5000) |

### Driver mock

LED no GPIO **2**, aceso por **1500** ms.

### Driver serial (sniffer)

| Item | Atual |
| --- | --- |
| RX | GPIO **16** |
| TX | GPIO **17** (só se ligar envio de debug) |
| Baud | **9600** |
| Formato | `SERIAL_8N1` |
| Envio de bytes para a máquina | `SERIAL_DEBUG_TX=0` (desligado — deixe assim) |

Monitor serial do computador: **115200**. Firmware marcado como versão `0.1.0` no `platformio.ini`.

O broker de desenvolvimento (`infra/mosquitto`) também está na porta 1883, sem senha. A placa e o Mosquitto precisam se enxergar na rede (o IP `192.168.0.10` só funciona se for realmente o IP do PC/servidor).

## Passos futuros (planejados)

- MQTT com TLS (`MQTT_USE_TLS 1`, certificado `MQTT_CA_CERT`, em geral porta 8883) e usuário/senha por placa
- Descobrir o **protocolo serial** da máquina (hoje o sniffer só publica hex em `lav/<id>/debug/rx`; o envio de liberação é um esboço)
- Só então um driver serial que **libere** o ciclo, com isolamento de tensão (3,3 V da ESP32 ≠ 5 V / 12 V / RS-485 da máquina)
- Relógio e rede estáveis nas lojas reais (NTP já é exigido para aceitar comando)

## Como fazer uma mudança pequena com segurança

**Trocar o Wi-Fi**

1. Edite `WIFI_SSID` e `WIFI_PASSWORD` em `include/secrets.h`.
2. Grave de novo o firmware (senão a placa continua na rede antiga). Veja `COMO-GRAVAR.md`.
3. Confira no monitor serial se conectou. Depois veja **Online** em Máquinas no dashboard.

**Trocar o servidor MQTT**

1. Coloque em `MQTT_HOST` o IP **atual** do PC/servidor (não `localhost`).
2. Mantenha a porta 1883 enquanto o Mosquitto de dev estiver sem TLS.
3. Grave de novo. Se o dashboard não mostrar a placa, o IP ou o Wi-Fi está errado — não é credencial Stone.

**Adicionar uma máquina**

1. Grave **outra** ESP32 (cada uma ganha ID pelo MAC).
2. Cadastre no dashboard quando aparecer online.
3. Só passe do mock para GPIO com técnico, optoacoplador e **sem** 220 V nos pinos da ESP32.

Não apague `COMO-GRAVAR.md`. Não ligue a placa na rede elétrica da máquina neste estágio.
