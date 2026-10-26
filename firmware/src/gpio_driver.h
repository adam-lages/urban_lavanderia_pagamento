#pragma once
#include <Arduino.h>
#include "config.h"
#include "release_driver.h"

/**
 * Pulso em um GPIO (via optoacoplador/relé): plano B (moeda ou botão Start).
 * Esta loja é Card/OPL: o chicote plug-in é serial de cartão (use esp32doit-serial).
 * Moeda (outro conector, 2 fios ~16,5 V): um pulso de 50 ms soma Co1; libera se ≥ r9Pr (100).
 * Nível ativo e duração: platformio.ini (GPIO_ACTIVE_LEVEL, GPIO_PULSE_MS=50).
 * Nunca ligue 220 V, 16,5 V ou 12,5 V no pino da ESP32.
 * O pino fica inativo no boot, entre pulsos e ao reiniciar.
 */
class GpioPulseDriver : public lav::ReleaseDriver {
 public:
  GpioPulseDriver(uint8_t pin, uint8_t activeLevel, uint32_t pulseMs)
      : pin_(pin), active_(activeLevel), pulseMs_(constrain(pulseMs, GPIO_PULSE_MIN_MS, GPIO_PULSE_MAX_MS)) {}

  const char* name() const override { return "gpio"; }
  bool begin() override {
    digitalWrite(pin_, inactive());
    pinMode(pin_, OUTPUT);
    digitalWrite(pin_, inactive());
    return true;
  }
  bool start(int, const char** reason) override {
    if (state_ == lav::DriverState::Busy) {
      if (reason) *reason = "busy";
      return false;
    }
    digitalWrite(pin_, active_);
    startedMs_ = millis();
    state_ = lav::DriverState::Busy;
    return true;
  }
  void loop(uint32_t nowMs) override {
    if (state_ == lav::DriverState::Busy && nowMs - startedMs_ >= pulseMs_) {
      digitalWrite(pin_, inactive());
      state_ = lav::DriverState::Done;
    }
  }
  lav::DriverState state() const override { return state_; }
  void acknowledge() override { state_ = lav::DriverState::Idle; }

 private:
  uint8_t inactive() const { return active_ == HIGH ? LOW : HIGH; }
  uint8_t pin_, active_;
  uint32_t pulseMs_, startedMs_ = 0;
  lav::DriverState state_ = lav::DriverState::Idle;
};
