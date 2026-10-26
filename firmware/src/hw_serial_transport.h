#pragma once
#include <Arduino.h>
#include "config.h"
#include "serial_driver.h"

/**
 * UART2 da ESP32 (Serial2). Em modo sniffer o TX NÃO é configurado (pino -1):
 * a ESP32 nunca transmite para a máquina. O TX só existe com SERIAL_DEBUG_TX=1.
 * Atenção: a UART da ESP32 é TTL 3,3 V. A serial da LG pode ser diferencial (RS-422/485): precisa de transceptor.
 */
class HardwareSerialTransport : public lav::SerialTransport {
 public:
  void begin() override {
#if SERIAL_DEBUG_TX
    const int tx = SERIAL_TX_PIN;
#else
    const int tx = -1;
#endif
    Serial2.begin(SERIAL_BAUD, SERIAL_FORMAT, SERIAL_RX_PIN, tx, SERIAL_INVERT);
  }
  int available() override { return Serial2.available(); }
  int read() override { return Serial2.read(); }
  size_t write(const uint8_t* data, size_t n) override { return Serial2.write(data, n); }
};
