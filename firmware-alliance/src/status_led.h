#pragma once
#include <Arduino.h>
#include "config.h"

class StatusLed {
 public:
  enum Color { Off, Blue, Green, Red };

  static constexpr bool enabled() { return RGB_R_PIN >= 0 && RGB_G_PIN >= 0 && RGB_B_PIN >= 0; }

  void begin() {
    if (!enabled()) return;
    pinMode(RGB_R_PIN, OUTPUT);
    pinMode(RGB_G_PIN, OUTPUT);
    pinMode(RGB_B_PIN, OUTPUT);
    last_ = static_cast<Color>(-1);
    set(Off);
  }

  void set(Color c) {
    if (!enabled() || c == last_) return;
    last_ = c;
    write(RGB_R_PIN, c == Red);
    write(RGB_G_PIN, c == Green);
    write(RGB_B_PIN, c == Blue);
  }

 private:
  static void write(int pin, bool on) { digitalWrite(pin, (on != (RGB_COMMON_ANODE != 0)) ? HIGH : LOW); }
  Color last_ = Off;
};
