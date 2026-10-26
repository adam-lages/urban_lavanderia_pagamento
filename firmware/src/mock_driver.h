#pragma once
#include <Arduino.h>
#include "config.h"
#include "release_driver.h"

/** Acende o LED onboard por MOCK_LED_MS. Não toca em nada externo: ideal para testar Wi-Fi/MQTT. */
class MockLedDriver : public lav::ReleaseDriver {
 public:
  explicit MockLedDriver(uint8_t pin) : pin_(pin) {}
  const char* name() const override { return "mock-led"; }
  bool begin() override {
    pinMode(pin_, OUTPUT);
    digitalWrite(pin_, LOW);
    return true;
  }
  bool start(int, const char** reason) override {
    if (state_ == lav::DriverState::Busy) {
      if (reason) *reason = "busy";
      return false;
    }
    digitalWrite(pin_, HIGH);
    startedMs_ = millis();
    state_ = lav::DriverState::Busy;
    return true;
  }
  void loop(uint32_t nowMs) override {
    if (state_ == lav::DriverState::Busy && nowMs - startedMs_ >= MOCK_LED_MS) {
      digitalWrite(pin_, LOW);
      state_ = lav::DriverState::Done;
    }
  }
  lav::DriverState state() const override { return state_; }
  void acknowledge() override { state_ = lav::DriverState::Idle; }

 private:
  uint8_t pin_;
  uint32_t startedMs_ = 0;
  lav::DriverState state_ = lav::DriverState::Idle;
};
