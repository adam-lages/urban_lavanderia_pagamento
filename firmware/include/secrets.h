// Versionado de propósito: repositório PRIVADO (decisão do dono). Nunca tornar público sem rotacionar.
#pragma once

#define WIFI_SSID "Urban_Lavanderia_Setup"
#define WIFI_PASSWORD "@Hoje123@"

#define MQTT_HOST "192.168.0.10"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""

#define MQTT_USE_TLS 0

// LED RGB externo OPCIONAL (azul = conectado, verde = comando recebido, vermelho = erro).
// Sem isto, só o LED azul da própria placa (GPIO2) pisca. Descomente e ajuste os pinos:
// #define RGB_R_PIN 25
// #define RGB_G_PIN 26
// #define RGB_B_PIN 27
// #define RGB_COMMON_ANODE 0  // 0 = cátodo comum (GND); 1 = ânodo comum (3,3 V). Use resistor ~220 ohm em cada cor.
