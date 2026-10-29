# Firmware ESP32 — Alliance / Speed Queen

Placa-alvo: **ESP32 DOIT DevKit V1**. Máquina-alvo: **Speed Queen STENXASP543DN01** (Alliance, Quantum Gold, stack lava+seca).

**Não use** a pasta `firmware-lg/` (LG Giant C) nestas máquinas. O conector e o protocolo são outros.

Comece por [Como gravar](COMO-GRAVAR.md). Uma placa por lado do stack (lavar **e** secar).

## Avisos

- ESP32 em 3,3 V / USB. Nunca 220 V, 12 V DC ou 24 V AC nos pinos.
- Não ligue nada na máquina antes de medir pinagem (H3 / H13) e tensões.
- GPIO 23 só no LED de um **optoacoplador**. O contato isolado vai na entrada de Start Pulse.
- Não corte o chicote da Cicclo sem ler o contrato.

## Ambientes

| Ambiente | Driver | Uso |
|---|---|---|
| `esp32doit-mock` | LED onboard | Wi-Fi + MQTT, sem máquina |
| `esp32doit-pulse` | Pulsos no GPIO 23 | Start Pulse Alliance (`SErPAy` = `S PLSE`) |
| `native` | testes no PC | `pio test -e native` |

Não há driver serial aqui. O protocolo de cartão Alliance não é público; serial fica para depois da medição.

## Contrato MQTT

Igual ao da LG (`lav/<id>/cmd` / `ack` / `status` / `info`), com duas diferenças:

- `channel` = **número de pulsos** (1 a 32). Com a máquina em `PLSMod` = `SingL`, envie **1**.
- `info` inclui `"brand":"alliance"`.

Na máquina: `SErPAy` = `S PLSE`, `PLS En` on, `PLSdEn` igual ao valor de cada pulso, `CardEn` off. Pinagem do H3 ainda **não medida**.

## Gravar

```bash
cd firmware-alliance
pio test -e native
pio run -e esp32doit-mock -t upload
```
