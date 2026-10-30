# Como gravar o firmware Alliance na ESP32

Placa: **ESP32 DOIT DevKit V1**. Pasta: `firmware-alliance` (não `firmware-lg`).

## Segurança

- Primeiro teste só no USB, longe da máquina.
- Nunca 220 V, 12 V ou 24 V nos pinos da ESP32.
- Não ligue o GPIO 23 na Speed Queen até existir mapa de pinos medido (H3/H13).

## Wi-Fi e MQTT

Edite `firmware-alliance/include/secrets.h`. `MQTT_HOST` é o **IP do PC na LAN**, não `localhost`. Rede 2,4 GHz.

## 1. Mock (LED)

```bash
cd firmware-alliance
pio test -e native
pio run -e esp32doit-mock -t upload
pio device monitor
```

Se travar em `Connecting...`, segure **BOOT**. No serial aparece `placa esp-...`. No dashboard, **Liberar** deve piscar o LED 3 vezes e ficar aceso ~2 s.

LED azul da placa: aceso fixo = conectado; pisca 3 vezes = liberação recebida; apagado = sem conexão ou erro. O LED vermelho é de energia e fica sempre aceso.

`channel` neste firmware é **1 a 32** (quantidade de pulsos). No mock o LED ignora o número.

## 2. Pulso (só depois de medir)

Ambiente `esp32doit-pulse`: GPIO 23 → resistor 330 Ω → LED do opto → GND. Contato do opto na entrada de Start Pulse da placa Alliance, **depois** da pinagem medida.

Na Speed Queen: `SErPAy` = `S PLSE`. Comece com `channel` = 1 (`SingL`).

Não plugar ainda: 220 V; 12 V/24 V na ESP32; chicote serial de 7 pinos; cabo da Cicclo no mesmo pino que o opto.
