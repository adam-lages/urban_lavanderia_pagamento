# Firmware da placa ESP32 (uma placa por máquina)

Placa-alvo: **ESP32 DOIT DevKit V1 (ESP32-WROOM-32)**. PlatformIO + Arduino.

**Comece por aqui se for gravar a placa pela primeira vez:** [Como gravar o código na ESP32](COMO-GRAVAR.md) (Arduino IDE e PlatformIO, Wi-Fi, modo mock e avisos de segurança).

A placa conecta no Wi-Fi, fala MQTT com o backend e, ao receber o comando de liberação, aciona **uma** máquina por meio de um **driver de liberação**.

## Avisos de segurança (leia antes de ligar qualquer fio)

- **Nunca ligue a ESP32 direto em 220 V / rede elétrica.** Ela trabalha com 3,3 V e é alimentada por USB/5 V.
- **Nada deve ser ligado na máquina antes de medir.** Primeiro: tomada fora, continuidade nos pinos do chicote de **cartão (ESDUS)**. Depois tensões. A lógica da placa da LG pode não ser isolada da rede. Veja `docs/analise-placa-e-protocolo.md` seção 10.
- **Nível de tensão:** a UART da ESP32 é **3,3 V (TTL)**. A serial da máquina LG pode usar outro nível (por exemplo 5 V, 12 V ou **diferencial RS-422/485**: Tx+/Tx−, Rx+/Rx−). Pode ser necessário um **conversor de nível** (level shifter) ou um **transceptor RS-422/485** (de preferência isolado). Ligar 5 V ou 12 V direto nos pinos da ESP32 **queima a placa**.
- Use sempre **GND comum só depois de medir** e prefira isolamento galvânico (optoacoplador, transceptor/USB isolado).
- Não corte, não solde e não remova nada do equipamento da Cicclo sem ler o contrato. Pode anular a garantia da LG.
- Teste com a máquina **vazia, sem água**, e com um técnico quando possível.

## Escolha do driver (ambiente do PlatformIO)

| Ambiente | Driver | Para quê |
|---|---|---|
| `esp32doit-mock` | LED onboard (GPIO 2) | Testar Wi-Fi + MQTT + dashboard **sem ligar nada** na máquina. Comece por aqui. |
| `esp32doit-serial` | UART2 em modo **sniffer** | Chicote de **cartão (ESDUS)**. **Não libera** (bytes desconhecidos). |
| `esp32doit-gpio` | Pulso 50 ms em GPIO 23 | Plano B: moeda (`Cndr`=0) ou Start, por **optoacoplador**. Sem 220 V. |

Configurações ficam em `platformio.ini` (`build_flags`): `GPIO_RELEASE_PIN`, `GPIO_ACTIVE_LEVEL` (`HIGH` ou `LOW`), `GPIO_PULSE_MS` (padrão **50**, faixa 20 a 5000), `SERIAL_RX_PIN`, `SERIAL_TX_PIN`, `SERIAL_BAUD` (9600 é chute), `SERIAL_FORMAT` (ex.: `SERIAL_8N1`, `SERIAL_8E1`), `SERIAL_INVERT`.

### Driver GPIO: fiação segura

A ESP32 **não** aciona a máquina diretamente. O GPIO controla um componente isolado, e só o contato dele fica em paralelo ao botão Start (ou entrada de moeda).

```
ESP32 GPIO23 --[resistor 330R]--> LED do optoacoplador (ex.: PC817) --> GND
                                  transistor do optoacoplador = em paralelo ao contato do botão Start
```

- Prefira **optoacoplador** (sinal de baixa tensão) a relé. Se usar módulo de relé, use um **com optoacoplador** e confira se é ativo em nível baixo (`GPIO_ACTIVE_LEVEL=LOW`).
- O lado da máquina (botão Start) deve ser medido antes: tensão, corrente e polaridade. Use só contato seco/baixa tensão; **nunca** comute 220 V com este circuito.
- Durante o reset da ESP32 o pino pode flutuar por instantes; use resistor de pull-down (ativo-alto) ou pull-up (ativo-baixo) no lado do GPIO.
- O firmware deixa o pino inativo ao ligar, entre pulsos e ao reiniciar, e nunca aceita um segundo pulso enquanto o primeiro corre.

### Driver serial (sniffer)

Objetivo: **escutar o chicote de cartão** (ESDUS, 6 fios, Tx±/Rx±). O painel está em **`r9Pr` ALL = 100**. Isso é preço de vend da máquina, não protocolo Cicclo. Veja `analise-placa-e-protocolo.md` seções 9 e 10. Baud 9600 **não** veio do manual.

- Usa a UART2: RX no GPIO 16 (TX no GPIO 17, só se `SERIAL_DEBUG_TX=1`). Camada de transporte abstrata (`SerialTransport`), então dá para trocar a UART real por outra implementação ou por um falso nos testes.
- Em modo sniffer o **TX nem é configurado**: a ESP32 não transmite nada para a máquina.
- Cada quadro recebido (separado por pausa de 20 ms) é publicado em hexadecimal em `lav/<id>/debug/rx`, como `{"t":<ms>,"n":<bytes>,"hex":"02 10 03"}`.
- Ligue **só o RX** (e GND, depois de medir) a um conversor de nível/transceptor. Para serial diferencial, use um transceptor RS-422/485 e leia Tx+/Tx− da máquina.
- Enquanto o protocolo for desconhecido, o comando de liberação recebe `rejected` com motivo `serial_protocol_unknown`.
- Para criar o driver final: implemente `SerialDriver::buildReleaseFrame()` em `lib/lav_core/serial_driver.cpp` (hoje é um stub) e faça `start()` enviar o quadro.
- **Envio de debug (desativado por padrão):** só funciona se você compilar com `-DSERIAL_DEBUG_TX=1` e publicar em `lav/<id>/debug/cmd` o JSON `{"hex":"AA BB CC","confirm":"SEND"}`. Nunca envie bytes com a Cicclo e a ESP32 transmitindo ao mesmo tempo no mesmo barramento.

Ver os quadros capturados:

```bash
mosquitto_sub -h <broker> -t 'lav/+/debug/rx' -v
```

## Credenciais (nada de senha no git)

1. `include/secrets.h` já está versionado com os valores atuais (repositório privado). Edite-o se precisar mudar:
2. Campos: `WIFI_SSID` (padrão `Urban Lavanderia`), `WIFI_PASSWORD`, e `MQTT_HOST`/`MQTT_PORT`/`MQTT_USER`/`MQTT_PASS`.

O `secrets.h` é versionado de propósito (repositório PRIVADO). Nunca torne o repositório público sem rotacionar as credenciais. Para usar TLS no MQTT, defina `MQTT_USE_TLS 1` e `MQTT_CA_CERT`.

## Gravar na ESP32 (passo a passo)

1. Instale o PlatformIO (`pip install platformio` ou a extensão do VS Code).
2. Confira o `secrets.h` (acima). No PC, `npm run dev:backend` já sobe o MQTT na porta 1883 (sem Docker). A placa precisa do **IP do computador na LAN** em `MQTT_HOST`, não `localhost`.
3. Conecte a ESP32 por USB (se não aparecer, instale o driver CP2102/CH340 e adicione seu usuário ao grupo `dialout` no Linux).
4. Grave começando pelo mock:
   ```bash
   cd firmware-lg
   pio run -e esp32doit-mock -t upload
   pio device monitor
   ```
   Se o upload travar em "Connecting...", segure o botão **BOOT** até começar.
5. No monitor serial aparece `placa esp-a4cf120b00ff` (derivada do MAC). Esse é o ID da placa.
6. Abra o dashboard, menu **Máquinas**: a placa nova aparece **Online**. Clique em **Cadastrar** (nome, loja, tipo) e em **Liberar máquina**. O LED onboard acende por 1,5 s e o estado vira **Confirmado**.
7. Só depois da continuidade/tensões, grave `esp32doit-serial` (sniffer). GPIO só como plano B de moeda/Start.

## Como funciona

- **ID único:** `esp-<MAC>`. Tópicos: `lav/<id>/cmd`, `ack`, `status`, `info` (contrato em `packages/protocol`).
- **Presença:** publica `online` retido ao conectar; o broker publica `offline` (LWT) se a placa cair. A cada 30 s envia heartbeat em `info` (firmware, IP, sinal Wi-Fi, uptime, driver).
- **Comando:** `{commandId, channel, issuedAt, expiresAt}`. A placa rejeita comando expirado (usa hora NTP; só fica online com o relógio certo), `channel` fora de **100–1000** (preço `r9Pr` em passos de 100) ou ocupada.
- **Idempotência:** guarda os últimos 16 `commandId` na memória não volátil (NVS), marcando **antes** de acionar. Repetido = não aciona de novo, só responde `done` outra vez.
- **Ack:** `done` ao terminar o pulso; `rejected` com motivo nos demais casos.
- **Robustez:** reconexão automática de Wi-Fi e MQTT, watchdog de 30 s, reinício se ficar 10 min sem Wi-Fi ou 15 min sem MQTT.
- Como há uma placa por máquina, o `channel` é validado mas **não** muda o acionamento no driver GPIO.

## Testes

```bash
cd firmware-lg
pio test -e native                                   # lógica no PC
pio run -e esp32doit-mock -e esp32doit-gpio -e esp32doit-serial   # compila os 3 drivers
```

Teste ponta a ponta sem hardware: `npm run dev:simulator` simula placas com o mesmo contrato.

## Não testado em hardware real

Wi-Fi/MQTT reais, pulso no GPIO, leitura da serial e o comportamento dentro da máquina LG só foram validados por compilação e testes no PC.
