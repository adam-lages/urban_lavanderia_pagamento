# Como gravar o código na ESP32 (passo a passo)

Este guia é para a placa **ESP32 DOIT DevKit V1** (o retângulo preto com ESP32-WROOM-32 e um LED azul).

Você **não precisa** ligar a placa em nenhuma máquina de lavar para o primeiro teste.

## Antes de começar — avisos de segurança

- **Não ligue a ESP32 na máquina 220 V** no primeiro teste. Ela funciona com USB (5 V) e lógica de 3,3 V.
- **Não conecte fios na lavadora/secadora** até o teste com LED dar certo.
- **Nunca** ligue 220 V, 16,5 V (moeda) ou 12,5 V (cartão) direto nos pinos da ESP32: isso queima a placa.
- Use só o cabo USB no computador. A placa pode ficar na mesa, longe da máquina.

---

## 1. Wi-Fi: SSID e senha

As senhas do Wi-Fi já estão no arquivo `firmware-lg/include/secrets.h` (repositório privado):

- **SSID:** `urban_lavanderia_setup`
- **Senha:** `@Hoje123@`

Para mudar a rede:

1. Abra `firmware-lg/include/secrets.h`.
2. Altere `WIFI_SSID` e `WIFI_PASSWORD`.
3. Grave o firmware de novo (senão a placa continua na rede antiga).

`MQTT_HOST` é o IP do computador/servidor onde o backend MQTT está rodando. **Não use `localhost`** na ESP32: `localhost` na placa é ela mesma, não o seu PC.

---

## 2. Primeiro teste: modo mock (só o LED)

No modo **mock** a placa **não aciona a máquina**.

**LED azul da própria ESP32** (vale para todos os modos):

- Pisca devagar = conectando ao Wi-Fi.
- **Aceso fixo** = Wi-Fi + servidor (MQTT) conectados.
- Ao receber “liberar”: **pisca 3 vezes rápido** e volta a ficar aceso.
- **Apagado** = sem conexão ou o comando falhou.

O **LED vermelho** da placa é só o indicador de energia: fica sempre aceso enquanto a placa tem alimentação. O programa não consegue controlá-lo. Para ter uma luz vermelha de erro, use o LED RGB (seção abaixo).

Comece **sempre** por esse modo.

| O que usar | Significado |
|---|---|
| Ambiente `esp32doit-mock` (PlatformIO) | LED, sem fios na máquina |
| `esp32doit-serial` | Depois do LED: **escutar** o chicote de **cartão** (ESDUS). Ainda não libera. |
| `esp32doit-gpio` | Só plano B (moeda 50 ms ou Start), com técnico e opto |

---

## 3. Gravar com PlatformIO (mais fácil neste projeto)

O firmware já está pronto para o PlatformIO.

1. Instale o [VS Code](https://code.visualstudio.com/) e a extensão **PlatformIO IDE**  
   (ou no terminal: `pip install platformio`).
2. Abra a pasta `firmware-lg` do projeto.
3. Conecte a ESP32 no USB. Se o computador não reconhecer, instale o driver **CP2102** ou **CH340** (depende do chip USB da sua placa). No Linux, seu usuário precisa do grupo `dialout`.
4. Grave o modo mock:

```bash
cd firmware-lg
pio run -e esp32doit-mock -t upload
pio device monitor
```

5. Se aparecer `Connecting...` e travar: segure o botão **BOOT** da placa até o upload começar.
6. No monitor serial (115200) aparece algo como `placa esp-a4cf...`. Esse é o ID da placa.
7. No dashboard, menu **Máquinas**, a placa deve ficar **Online**. Cadastre e clique em **Liberar máquina**: o LED deve piscar (veja a seção 3.1).

### 3.1 Teste do Liberar (confirmar que o LED reage)

1. Edite `firmware-lg/include/secrets.h`: `MQTT_HOST` = **IP do seu PC na rede local** (não `localhost`; no Windows use `ipconfig`, no Linux/Mac `ip a` ou `ifconfig`). `MQTT_PORT` = **1883**. PC e ESP32 no mesmo Wi-Fi (2,4 GHz).
2. No PC, rode o backend (`npm run dev:backend`). Ele já abre o MQTT na porta 1883.
3. **Firewall**: libere a porta **TCP 1883** de entrada no PC (Windows: “Firewall do Windows” → nova regra de entrada). Sem isso a placa nunca fica Online.
4. Grave o `esp32doit-mock` e abra o monitor serial. Anote o ID (`esp-...`).
5. No dashboard → **Máquinas**: a placa aparece **Online**. Dê o nome **Lavadora 1** (loja e tipo Lavadora) e salve. Dica: se o backend subir com `DEMO_BOARD_ID=esp-SEU_ID`, a placa já nasce como “Lavadora 1” no banco novo.
6. Clique em **Liberar** na Lavadora 1. O LED azul da placa (que já estava aceso) deve **piscar 3 vezes rápido** e voltar a ficar aceso. No monitor serial aparece `[cmd] executando` e depois `[ack]`.

Se não piscar: placa Offline (confira IP, porta, firewall, Wi-Fi) ou ID diferente do cadastrado.

Detalhes extras (GPIO, serial, MQTT) estão em [`README.md`](README.md).

---

### LED RGB de status (recomendado)

**O que comprar**: 1 LED RGB de 5 mm **cátodo comum** (4 pernas, a mais longa é o GND) e 3 resistores de **220 Ω**. Opcional: protoboard e fios macho-fêmea.

| Perna do LED RGB | Resistor | Pino da ESP32 |
| --- | --- | --- |
| Vermelho (R) | 220 Ω | GPIO **25** |
| Verde (G) | 220 Ω | GPIO **26** |
| Azul (B) | 220 Ω | GPIO **27** |
| Perna longa (GND comum) | nenhum | **GND** |

**Cores**: azul piscando devagar = conectando; **azul fixo** = Wi-Fi + MQTT conectados; **verde** (3 piscadas rápidas + ~2 s aceso) = comando de liberar recebido; **vermelho** = sem Wi-Fi/MQTT, ou comando falhou/expirou.

**Aviso**: o LED só liga na ESP32. **Não ligue nada deste LED à máquina LG.**

**Ânodo comum** (perna longa vai ao 3,3 V): ligue a perna longa no **3V3** e troque em `firmware-lg/include/secrets.h` para `#define RGB_COMMON_ANODE 1`.

**Sem RGB ligado**: nada quebra; o LED azul da própria placa continua mostrando o status (aceso = conectado, apagado = erro). Para desligar o recurso, comente as 3 linhas `RGB_*_PIN` em `secrets.h`.

## 4. Gravar com Arduino IDE (versão curta)

O projeto foi feito para PlatformIO. A Arduino IDE também serve, com um pouco mais de trabalho.

1. Instale a [Arduino IDE 2](https://www.arduino.cc/en/software).
2. Em **Arquivo → Preferências**, cole esta URL em “URLs adicionais de gerenciadores de placas”:

   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`

3. Em **Ferramentas → Placa → Gerenciador de placas**, instale **esp32** (Espressif).
4. Em **Ferramentas → Placa**, escolha **DOIT ESP32 DEVKIT V1** (ou “ESP32 Dev Module”).
5. Em **Ferramentas → Porta**, escolha a porta USB da placa.
6. Em **Ferramentas → Gerenciar bibliotecas**, instale **PubSubClient** e **ArduinoJson**.
7. O código está em `firmware-lg/src/main.cpp`, com pastas `include/` e `lib/lav_core/`.  
   Para o **primeiro teste (mock)**, o programa precisa ser compilado com `RELEASE_DRIVER` = `0` (LED).  
   Se a IDE não achar os arquivos, o caminho mais simples é gravar pelo PlatformIO (seção 3).
8. Clique em **Carregar** (seta). Se travar em “Connecting…”, segure **BOOT**.

Use o **Monitor Serial** a 115200 para ver o ID da placa.

---

## 5. O que fazer depois que o LED funcionar

A máquina **já tem chicote** para o cabo da ESP32. No modelo Card/OPL esse chicote é o de **leitor (6 fios, serial)**.

**Plugar (quando for a hora):** só o conector de **cartão / ESDUS**. Na primeira vez, máquina **desligada da tomada**, mapear pinos. Depois medir tensões. Depois sniffer (`esp32doit-serial`) com transceptor isolado, **só RX**.

**Não plugar ainda:** 220 V; 12,5 V ou 16,5 V na ESP32; TX da ESP32; o conector de **moeda** (2 fios) se você estiver no caminho de cartão.

Leia [`docs/analise-placa-e-protocolo.md`](../docs/analise-placa-e-protocolo.md) seções 9 e 10. Vend **100** (`r9Pr` / ALL) é preço da LG, não protocolo Cicclo. **Não invente bytes UART.**

Até a continuidade estar anotada, deixe a ESP32 só no USB e no Wi-Fi.
