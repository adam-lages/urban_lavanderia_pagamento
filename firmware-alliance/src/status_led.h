#pragma once
#include <Arduino.h>
#include "config.h"
#include "led_status.h"

class StatusLed {
 public:
  void begin() {
    if (hasOnboard()) pinMode(ONBOARD_LED_PIN, OUTPUT);
    if (hasRgb()) {
      pinMode(RGB_R_PIN, OUTPUT);
      pinMode(RGB_G_PIN, OUTPUT);
      pinMode(RGB_B_PIN, OUTPUT);
    }
    initialized_ = false;
    set(lav::RgbColor::Off);
  }

  void set(lav::RgbColor c) {
    if (initialized_ && c == last_) return;
    initialized_ = true;
    last_ = c;
    if (hasOnboard()) digitalWrite(ONBOARD_LED_PIN, lav::onboardLedOn(c) ? HIGH : LOW);
    if (!hasRgb()) return;
    writeRgb(RGB_R_PIN, c == lav::RgbColor::Red);
    writeRgb(RGB_G_PIN, c == lav::RgbColor::Green);
    writeRgb(RGB_B_PIN, c == lav::RgbColor::Blue);
  }

 private:
  static constexpr bool hasOnboard() { return ONBOARD_LED_PIN >= 0; }
  static constexpr bool hasRgb() { return RGB_R_PIN >= 0 && RGB_G_PIN >= 0 && RGB_B_PIN >= 0; }
  static void writeRgb(int pin, bool on) { digitalWrite(pin, (on != (RGB_COMMON_ANODE != 0)) ? HIGH : LOW); }
  lav::RgbColor last_ = lav::RgbColor::Off;
  bool initialized_ = false;
};
