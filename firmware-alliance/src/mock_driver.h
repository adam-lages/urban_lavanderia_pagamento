#pragma once
#include <Arduino.h>
#include "config.h"
#include "led_pattern.h"
#include "release_driver.h"

class MockDriver : public lav::ReleaseDriver {
 public:
  const char* name() const override { return "mock-led"; }
  bool begin() override { return true; }
  bool start(int, const char** reason) override {
    if (state_ == lav::DriverState::Busy) {
      if (reason) *reason = "busy";
      return false;
    }
    startedMs_ = millis();
    state_ = lav::DriverState::Busy;
    return true;
  }
  void loop(uint32_t nowMs) override {
    if (state_ == lav::DriverState::Busy && pattern_.finished(nowMs - startedMs_)) state_ = lav::DriverState::Done;
  }
  lav::DriverState state() const override { return state_; }
  void acknowledge() override { state_ = lav::DriverState::Idle; }

 private:
  uint32_t startedMs_ = 0;
  lav::LedPattern pattern_{CMD_BLINKS, CMD_BLINK_MS, CMD_HOLD_MS};
  lav::DriverState state_ = lav::DriverState::Idle;
};
