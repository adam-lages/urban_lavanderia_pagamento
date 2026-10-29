#pragma once
#include <stdint.h>
#include "led_pattern.h"

namespace lav {

enum class RgbColor : uint8_t { Off, Blue, Green, Red };

struct LedInputs {
  bool connected;
  bool everConnected;
  uint32_t sinceBootMs;
  bool cmdActive;
  uint32_t cmdElapsedMs;
  bool errorActive;
};

constexpr uint32_t kConnectingGraceMs = 30000;
constexpr uint32_t kConnectingBlinkMs = 500;

inline RgbColor ledColor(const LedInputs& in, const LedPattern& cmd) {
  if (in.cmdActive && !cmd.finished(in.cmdElapsedMs)) return cmd.isOn(in.cmdElapsedMs) ? RgbColor::Green : RgbColor::Off;
  if (in.errorActive) return RgbColor::Red;
  if (in.connected) return RgbColor::Blue;
  if (!in.everConnected && in.sinceBootMs < kConnectingGraceMs)
    return (in.sinceBootMs / kConnectingBlinkMs) % 2 == 0 ? RgbColor::Blue : RgbColor::Off;
  return RgbColor::Red;
}

}  // namespace lav
