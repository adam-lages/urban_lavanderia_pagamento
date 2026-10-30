#pragma once
#include <stdint.h>
#include "led_pattern.h"

namespace lav {

enum class RgbColor : uint8_t { Off, Blue, Green, Red };

struct LedInputs {
  bool connected;         // Wi-Fi + MQTT conectados
  bool everConnected;     // já conectou desde que ligou
  uint32_t sinceBootMs;
  bool cmdActive;         // comando de liberar em andamento (padrão verde)
  uint32_t cmdElapsedMs;
  bool errorActive;       // comando falhou/expirou há pouco
};

constexpr uint32_t kConnectingGraceMs = 30000;
constexpr uint32_t kConnectingBlinkMs = 500;

/** Decide a cor do LED RGB. Sem bloqueio: só depende dos tempos recebidos. */
inline RgbColor ledColor(const LedInputs& in, const LedPattern& cmd) {
  if (in.cmdActive && !cmd.finished(in.cmdElapsedMs)) return cmd.isOn(in.cmdElapsedMs) ? RgbColor::Green : RgbColor::Off;
  if (in.errorActive) return RgbColor::Red;
  if (in.connected) return RgbColor::Blue;
  if (!in.everConnected && in.sinceBootMs < kConnectingGraceMs)
    return (in.sinceBootMs / kConnectingBlinkMs) % 2 == 0 ? RgbColor::Blue : RgbColor::Off;
  return RgbColor::Red;
}

/** LED azul da placa (só uma cor): aceso quando o RGB estaria azul ou verde; apagado em erro. */
inline bool onboardLedOn(RgbColor c) { return c == RgbColor::Blue || c == RgbColor::Green; }

}  // namespace lav
