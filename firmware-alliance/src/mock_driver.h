#pragma once
#include <Arduino.h>
#include "config.h"
#include "led_pattern.h"
#include "release_driver.h"

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
    if (state_ != lav::DriverState::Busy) return;
    const uint32_t elapsed = nowMs - startedMs_;
    if (pattern_.finished(elapsed)) {
      digitalWrite(pin_, LOW);
      state_ = lav::DriverState::Done;
    } else {
      digitalWrite(pin_, pattern_.isOn(elapsed) ? HIGH : LOW);
    }
  }
  lav::DriverState state() const override { return state_; }
  void acknowledge() override { state_ = lav::DriverState::Idle; }

 private:
  uint8_t pin_;
  uint32_t startedMs_ = 0;
  lav::LedPattern pattern_{CMD_BLINKS, CMD_BLINK_MS, CMD_HOLD_MS};
  lav::DriverState state_ = lav::DriverState::Idle;
};
