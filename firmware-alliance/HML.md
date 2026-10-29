# Guia HML — Firmware Alliance (Speed Queen)

Placa: ESP32 DOIT DevKit V1. Máquina: **STENXASP543DN01** (Quantum Gold). Gravação: [`COMO-GRAVAR.md`](COMO-GRAVAR.md).

Cada lado do stack (lavar e secar) ganha **uma** ESP32. Wi-Fi 2,4 GHz, MQTT no IP do PC (`secrets.h`), backend com `npm run dev:backend`.

| Ambiente | O que faz |
|---|---|
| `esp32doit-mock` | LED. Sem fio na máquina. |
| `esp32doit-pulse` | Pulsos 50 ms / folga 50 ms no GPIO 23 via opto. Start Pulse Alliance. |

O `channel` MQTT **não** é o preço LG 100–1000. Aqui é a **quantidade de pulsos** (1–32).

LED RGB opcional: pinos 25/26/27, cátodo comum. Não ligue o RGB na máquina.

Ainda falta: foto/pinagem do H3, largura real do pulso da Cicclo, tensões. Sem isso, não há serial e não há plugar na placa.
