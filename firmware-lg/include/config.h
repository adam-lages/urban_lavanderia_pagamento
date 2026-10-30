#pragma once
#include <Arduino.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Crie firmware-lg/include/secrets.h a partir de secrets.example.h"
#endif

#ifndef RELEASE_DRIVER
#define RELEASE_DRIVER 0
#endif
#ifndef FW_VERSION
#define FW_VERSION "dev"
#endif

// Driver GPIO (RELEASE_DRIVER=1)
#ifndef GPIO_RELEASE_PIN
#define GPIO_RELEASE_PIN 23
#endif
#ifndef GPIO_ACTIVE_LEVEL
#define GPIO_ACTIVE_LEVEL HIGH  // use LOW para módulo de relé "ativo em nível baixo"
#endif
#ifndef GPIO_PULSE_MS
#define GPIO_PULSE_MS 50  // LG Coin Drop Type 0: 50 ms (ESD/Greenwald/Munzprufer)
#endif
#define GPIO_PULSE_MIN_MS 20
#define GPIO_PULSE_MAX_MS 5000

// LED azul da placa: aceso = conectado; pisca = comando recebido; apagado = sem Wi-Fi/MQTT ou erro.
// O LED vermelho da placa é de energia (ligado direto no 3,3 V): fica sempre aceso, o firmware não controla.
#ifndef ONBOARD_LED_PIN
#define ONBOARD_LED_PIN 2
#endif
// Padrão ao receber "liberar": 3 piscadas rápidas + ~2 s aceso.
#ifndef CMD_BLINKS
#define CMD_BLINKS 3
#endif
#ifndef CMD_BLINK_MS
#define CMD_BLINK_MS 150
#endif
#ifndef CMD_HOLD_MS
#define CMD_HOLD_MS 2000
#endif

// LED RGB externo (OPCIONAL). Defina os 3 pinos em secrets.h; -1 = sem RGB (só o LED onboard).
// Azul = conectado, verde = comando recebido, vermelho = erro (sem Wi-Fi/MQTT ou comando falhou).
#ifndef RGB_R_PIN
#define RGB_R_PIN -1
#endif
#ifndef RGB_G_PIN
#define RGB_G_PIN -1
#endif
#ifndef RGB_B_PIN
#define RGB_B_PIN -1
#endif
#ifndef RGB_COMMON_ANODE
#define RGB_COMMON_ANODE 0  // 0 = cátodo comum (GND comum); 1 = ânodo comum (3,3 V comum)
#endif

// Driver serial (RELEASE_DRIVER=2)
#ifndef SERIAL_RX_PIN
#define SERIAL_RX_PIN 16
#endif
#ifndef SERIAL_TX_PIN
#define SERIAL_TX_PIN 17
#endif
#ifndef SERIAL_BAUD
#define SERIAL_BAUD 9600  // chute: a LG não publica baud
#endif
#ifndef SERIAL_FORMAT
#define SERIAL_FORMAT SERIAL_8N1
#endif
#ifndef SERIAL_INVERT
#define SERIAL_INVERT 0
#endif
// 1 habilita o comando de debug que ENVIA bytes na serial da máquina. Deixe 0.
#ifndef SERIAL_DEBUG_TX
#define SERIAL_DEBUG_TX 0
#endif
#define SERIAL_SNIFFER_GAP_MS 20

// Tempos
#define HEARTBEAT_MS 30000
#define MQTT_KEEPALIVE_S 15
#define WDT_TIMEOUT_S 30
#define WIFI_RETRY_MS 10000
#define WIFI_RESTART_AFTER_MS (10UL * 60UL * 1000UL)
#define MQTT_RETRY_MS 5000
#define MQTT_RESTART_AFTER_MS (15UL * 60UL * 1000UL)
#define NTP_WAIT_RESTART_MS (5UL * 60UL * 1000UL)
