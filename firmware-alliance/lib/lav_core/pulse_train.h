#pragma once
#include <stdint.h>

namespace lav {

/** Sequência de pulsos (Alliance Start Pulse): N vezes ativo pulseMs, inativo gapMs. */
class PulseTrain {
 public:
  bool start(uint8_t count, uint32_t pulseMs, uint32_t gapMs, uint32_t nowMs) {
    if (count == 0 || busy_) return false;
    remaining_ = count;
    pulseMs_ = pulseMs;
    gapMs_ = gapMs;
    active_ = true;
    phaseStart_ = nowMs;
    remaining_--;
    busy_ = true;
    finished_ = false;
    return true;
  }

  void tick(uint32_t nowMs) {
    if (!busy_ || finished_) return;
    if (active_) {
      if (nowMs - phaseStart_ < pulseMs_) return;
      active_ = false;
      phaseStart_ = nowMs;
      if (remaining_ == 0) {
        finished_ = true;
        busy_ = false;
      }
      return;
    }
    if (nowMs - phaseStart_ < gapMs_) return;
    active_ = true;
    phaseStart_ = nowMs;
    remaining_--;
  }

  bool outputActive() const { return active_; }
  bool finished() const { return finished_; }
  bool busy() const { return busy_; }
  void clearFinished() { finished_ = false; }

 private:
  uint8_t remaining_ = 0;
  bool active_ = false;
  bool busy_ = false;
  bool finished_ = false;
  uint32_t pulseMs_ = 0;
  uint32_t gapMs_ = 0;
  uint32_t phaseStart_ = 0;
};

}  // namespace lav
