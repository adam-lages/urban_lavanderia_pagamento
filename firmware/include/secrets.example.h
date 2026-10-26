// Modelo sem segredos. O secrets.h real está versionado (repo privado).
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

// LED RGB externo OPCIONAL (azul = conectado, verde = comando recebido, vermelho = erro).
// Sem isto, só o LED azul da própria placa (GPIO2) pisca. Descomente e ajuste os pinos:
// #define RGB_R_PIN 25
// #define RGB_G_PIN 26
// #define RGB_B_PIN 27
// #define RGB_COMMON_ANODE 0  // 0 = cátodo comum (GND); 1 = ânodo comum (3,3 V). Use resistor ~220 ohm em cada cor.
