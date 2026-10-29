// Versionado de propósito: repositório PRIVADO (decisão do dono). Nunca tornar público sem rotacionar.
#pragma once

#define WIFI_SSID "urban_lavanderia_setup"
#define WIFI_PASSWORD "@Hoje123@"

#define MQTT_HOST "10.33.253.103"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""

#define MQTT_USE_TLS 0

// LED RGB externo OPCIONAL (azul = conectado, verde = comando recebido, vermelho = erro).
// Ativo por padrão (pinos 25/26/27). Sem RGB ligado, o LED azul da placa (GPIO2) segue funcionando.
// Para desativar, comente as 3 linhas dos pinos.
#define RGB_R_PIN 25
#define RGB_G_PIN 26
#define RGB_B_PIN 27
#define RGB_COMMON_ANODE 0  // 0 = cátodo comum (GND); 1 = ânodo comum (3,3 V). Use resistor ~220 ohm em cada cor.
