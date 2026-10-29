#pragma once
#include <stdint.h>

namespace lav {

struct LedPattern {
  uint8_t blinks;
  uint16_t blinkMs;
  uint16_t holdMs;

  uint32_t totalMs() const { return static_cast<uint32_t>(blinks) * blinkMs * 2 + holdMs; }
  bool finished(uint32_t elapsedMs) const { return elapsedMs >= totalMs(); }
  bool isOn(uint32_t elapsedMs) const {
    const uint32_t blinkPart = static_cast<uint32_t>(blinks) * blinkMs * 2;
    if (elapsedMs < blinkPart) return (elapsedMs / blinkMs) % 2 == 0;
    return elapsedMs < blinkPart + holdMs;
  }
};

}  // namespace lav
