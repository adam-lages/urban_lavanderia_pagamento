#pragma once
#include <Arduino.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Crie firmware-alliance/include/secrets.h a partir de secrets.example.h"
#endif

#ifndef RELEASE_DRIVER
#define RELEASE_DRIVER 0
#endif
#ifndef FW_VERSION
#define FW_VERSION "dev"
#endif

#ifndef GPIO_RELEASE_PIN
#define GPIO_RELEASE_PIN 23
#endif
#ifndef GPIO_ACTIVE_LEVEL
#define GPIO_ACTIVE_LEVEL HIGH
#endif
#ifndef GPIO_PULSE_MS
#define GPIO_PULSE_MS 50
#endif
#ifndef GPIO_GAP_MS
#define GPIO_GAP_MS 50
#endif
#define GPIO_PULSE_MIN_MS 20
#define GPIO_PULSE_MAX_MS 5000

#ifndef MOCK_LED_PIN
#define MOCK_LED_PIN 2
#endif
#ifndef CMD_BLINKS
#define CMD_BLINKS 3
#endif
#ifndef CMD_BLINK_MS
#define CMD_BLINK_MS 150
#endif
#ifndef CMD_HOLD_MS
#define CMD_HOLD_MS 2000
#endif

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
#define RGB_COMMON_ANODE 0
#endif

#define HEARTBEAT_MS 30000
#define MQTT_KEEPALIVE_S 15
#define WDT_TIMEOUT_S 30
#define WIFI_RETRY_MS 10000
#define WIFI_RESTART_AFTER_MS (10UL * 60UL * 1000UL)
#define MQTT_RETRY_MS 5000
#define MQTT_RESTART_AFTER_MS (15UL * 60UL * 1000UL)
#define NTP_WAIT_RESTART_MS (5UL * 60UL * 1000UL)
