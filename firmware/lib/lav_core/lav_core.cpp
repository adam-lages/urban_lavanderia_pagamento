#include "lav_core.h"
#include <ArduinoJson.h>
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

namespace lav {

static int64_t daysFromCivil(int y, unsigned m, unsigned d) {
  y -= m <= 2;
  const int era = (y >= 0 ? y : y - 399) / 400;
  const unsigned yoe = static_cast<unsigned>(y - era * 400);
  const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return static_cast<int64_t>(era) * 146097 + static_cast<int64_t>(doe) - 719468;
}

bool parseIso8601(const char* s, int64_t& epochMs) {
  if (!s) return false;
  int Y, M, D, h, m, sec;
  int consumed = 0;
  if (sscanf(s, "%4d-%2d-%2dT%2d:%2d:%2d%n", &Y, &M, &D, &h, &m, &sec, &consumed) != 6) return false;
  if (M < 1 || M > 12 || D < 1 || D > 31 || h > 23 || m > 59 || sec > 60) return false;
  const char* p = s + consumed;
  int ms = 0;
  if (*p == '.') {
    p++;
    int digits = 0;
    while (isdigit(static_cast<unsigned char>(*p))) {
      if (digits < 3) {
        ms = ms * 10 + (*p - '0');
        digits++;
      }
      p++;
    }
    while (digits++ < 3) ms *= 10;
  }
  if (*p != 'Z' || p[1] != '\0') return false;
  epochMs = ((daysFromCivil(Y, M, D) * 24 + h) * 60 + m) * 60LL * 1000 + sec * 1000LL + ms;
  return true;
}

ParseResult parseCommand(const char* json, size_t len, Command& cmd) {
  memset(&cmd, 0, sizeof(cmd));
  JsonDocument doc;
  if (deserializeJson(doc, json, len) || !doc.is<JsonObject>()) return ParseResult::BadJson;
  const char* id = doc["commandId"] | static_cast<const char*>(nullptr);
  if (!id || !*id) return ParseResult::NoId;
  if (strlen(id) >= kIdCap) return ParseResult::NoId;
  strncpy(cmd.id, id, kIdCap - 1);
  if (!doc["channel"].is<int>()) return ParseResult::Invalid;
  cmd.channel = doc["channel"].as<int>();
  if (!parseIso8601(doc["issuedAt"] | "", cmd.issuedMs)) return ParseResult::Invalid;
  if (!parseIso8601(doc["expiresAt"] | "", cmd.expiresMs)) return ParseResult::Invalid;
  return ParseResult::Ok;
}

Verdict judge(const Command& cmd, bool alreadyExecuted, int64_t nowMs) {
  if (alreadyExecuted) return Verdict::Duplicate;
  if (nowMs <= 0) return Verdict::ClockNotSynced;
  if (nowMs >= cmd.expiresMs) return Verdict::Expired;
  if (cmd.channel < kMinChannel || cmd.channel > kMaxChannel) return Verdict::BadChannel;
  return Verdict::Execute;
}

bool RecentIds::has(const char* id) const {
  for (size_t i = 0; i < kSize; i++)
    if (slots_[i][0] && strncmp(slots_[i], id, kIdCap) == 0) return true;
  return false;
}
void RecentIds::add(const char* id) {
  if (has(id)) return;
  memset(slots_[next_], 0, kIdCap);
  strncpy(slots_[next_], id, kIdCap - 1);
  next_ = (next_ + 1) % kSize;
}
void RecentIds::remove(const char* id) {
  for (size_t i = 0; i < kSize; i++)
    if (strncmp(slots_[i], id, kIdCap) == 0) memset(slots_[i], 0, kIdCap);
}
void RecentIds::load(const uint8_t* data, size_t len) {
  if (len != kBlobSize) return;
  memcpy(slots_, data, kBlobSize);
  for (size_t i = 0; i < kSize; i++) slots_[i][kIdCap - 1] = 0;
  next_ = 0;
  for (size_t i = 0; i < kSize; i++)
    if (slots_[i][0]) next_ = (i + 1) % kSize;
}

size_t buildAck(char* out, size_t cap, const char* commandId, bool done, const char* reason) {
  JsonDocument doc;
  doc["commandId"] = commandId;
  doc["status"] = done ? "done" : "rejected";
  if (reason && *reason) doc["reason"] = reason;
  return serializeJson(doc, out, cap);
}

void deviceIdFromMac(const uint8_t mac[6], char* out, size_t cap) {
  snprintf(out, cap, "esp-%02x%02x%02x%02x%02x%02x", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

size_t hexEncode(const uint8_t* data, size_t n, char* out, size_t cap) {
  size_t w = 0;
  for (size_t i = 0; i < n; i++) {
    if (w + 3 + 1 > cap) break;
    w += snprintf(out + w, cap - w, i ? " %02X" : "%02X", data[i]);
  }
  if (cap) out[w < cap ? w : cap - 1] = 0;
  return w;
}

int hexDecode(const char* s, uint8_t* out, size_t cap) {
  size_t n = 0;
  while (*s) {
    while (*s == ' ' || *s == ',' || *s == ':') s++;
    if (!*s) break;
    if (s[0] == '0' && (s[1] == 'x' || s[1] == 'X')) s += 2;
    if (!isxdigit(static_cast<unsigned char>(s[0])) || !isxdigit(static_cast<unsigned char>(s[1]))) return -1;
    if (n >= cap) return -1;
    char tmp[3] = {s[0], s[1], 0};
    out[n++] = static_cast<uint8_t>(strtoul(tmp, nullptr, 16));
    s += 2;
  }
  return static_cast<int>(n);
}

bool RxChunker::push(uint8_t b, uint32_t nowMs, uint8_t* out, size_t& n) {
  bool emitted = false;
  if (len_ && nowMs - lastMs_ >= gapMs_) {
    n = take(out);
    emitted = true;
  }
  buf_[len_++] = b;
  lastMs_ = nowMs;
  if (!emitted && len_ >= kCap) {
    n = take(out);
    emitted = true;
  }
  return emitted;
}

bool RxChunker::idleFlush(uint32_t nowMs, uint8_t* out, size_t& n) {
  if (len_ && nowMs - lastMs_ >= gapMs_) {
    n = take(out);
    return true;
  }
  return false;
}

size_t RxChunker::take(uint8_t* out) {
  size_t n = len_;
  memcpy(out, buf_, n);
  len_ = 0;
  return n;
}

}  // namespace lav
