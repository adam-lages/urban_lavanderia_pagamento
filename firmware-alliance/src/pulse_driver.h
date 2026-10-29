#pragma once
#include <Arduino.h>
#include "config.h"
#include "lav_core.h"
#include "pulse_train.h"
#include "release_driver.h"

/**
 * Start Pulse Alliance (SErPAy = S PLSE no H3/H13). `channel` = número de pulsos.
 * GPIO só aciona opto/relé isolado. Nunca 220 V, 12 V ou 24 V no pino da ESP32.
 */
class StartPulseDriver : public lav::ReleaseDriver {
 public:
  StartPulseDriver(uint8_t pin, uint8_t activeLevel, uint32_t pulseMs, uint32_t gapMs)
      : pin_(pin),
        active_(activeLevel),
        pulseMs_(constrain(pulseMs, GPIO_PULSE_MIN_MS, GPIO_PULSE_MAX_MS)),
        gapMs_(constrain(gapMs, GPIO_PULSE_MIN_MS, GPIO_PULSE_MAX_MS)) {}

  const char* name() const override { return "start-pulse"; }
  bool begin() override {
    digitalWrite(pin_, inactive());
    pinMode(pin_, OUTPUT);
    digitalWrite(pin_, inactive());
    return true;
  }
  bool start(int channel, const char** reason) override {
    if (train_.busy()) {
      if (reason) *reason = "busy";
      return false;
    }
    if (channel < lav::kMinChannel || channel > lav::kMaxChannel) {
      if (reason) *reason = "invalid_channel";
      return false;
    }
    if (!train_.start(static_cast<uint8_t>(channel), pulseMs_, gapMs_, millis())) {
      if (reason) *reason = "driver_error";
      return false;
    }
    apply();
    state_ = lav::DriverState::Busy;
    return true;
  }
  void loop(uint32_t nowMs) override {
    if (state_ != lav::DriverState::Busy) return;
    train_.tick(nowMs);
    apply();
    if (train_.finished()) {
      digitalWrite(pin_, inactive());
      train_.clearFinished();
      state_ = lav::DriverState::Done;
    }
  }
  lav::DriverState state() const override { return state_; }
  void acknowledge() override { state_ = lav::DriverState::Idle; }

 private:
  uint8_t inactive() const { return active_ == HIGH ? LOW : HIGH; }
  void apply() { digitalWrite(pin_, train_.outputActive() ? active_ : inactive()); }

  uint8_t pin_, active_;
  uint32_t pulseMs_, gapMs_;
  lav::PulseTrain train_;
  lav::DriverState state_ = lav::DriverState::Idle;
};
