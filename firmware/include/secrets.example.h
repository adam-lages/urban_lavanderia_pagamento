// Copie para include/secrets.h (arquivo ignorado pelo git) e preencha.
// NUNCA versione o secrets.h real.
#pragma once

#define WIFI_SSID "Urban_Lavanderia_Setup"
#define WIFI_PASSWORD "COLOQUE_A_SENHA_DO_WIFI_AQUI"

#define MQTT_HOST "192.168.0.10"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""

// 1 = MQTT sobre TLS (porta 8883). Sem MQTT_CA_CERT a validação do servidor é DESLIGADA (só para teste).
#define MQTT_USE_TLS 0
// #define MQTT_CA_CERT "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
