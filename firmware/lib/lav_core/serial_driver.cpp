#include "serial_driver.h"

namespace lav {

/* Sem captura: não há quadro. channel seria o r9Pr (100…). */
size_t SerialDriver::buildReleaseFrame(int, uint8_t*, size_t) { return 0; }

bool SerialDriver::start(int channel, const char** reason) {
  uint8_t frame[32];
  if (buildReleaseFrame(channel, frame, sizeof(frame)) == 0) {
    if (reason) *reason = "serial_protocol_unknown";
    return false;
  }
  if (reason) *reason = "serial_release_not_enabled";
  return false;
}

void SerialDriver::emit(const uint8_t* data, size_t n) {
  if (!sink_ || !n) return;
  char hex[RxChunker::kCap * 3 + 1];
  hexEncode(data, n, hex, sizeof(hex));
  sink_(hex, n);
}

void SerialDriver::loop(uint32_t nowMs) {
  uint8_t out[RxChunker::kCap];
  size_t n = 0;
  while (transport_.available() > 0) {
    int b = transport_.read();
    if (b < 0) break;
    rxBytes_++;
    if (chunker_.push(static_cast<uint8_t>(b), nowMs, out, n)) emit(out, n);
  }
  if (chunker_.idleFlush(nowMs, out, n)) emit(out, n);
}

bool SerialDriver::debugSend(const uint8_t* data, size_t n) {
#if SERIAL_DEBUG_TX
  if (!n) return false;
  return transport_.write(data, n) == n;
#else
  (void)data;
  (void)n;
  return false;
#endif
}

}  // namespace lav
