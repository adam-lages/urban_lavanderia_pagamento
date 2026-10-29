#pragma once
#include <stddef.h>
#include <stdint.h>

namespace lav {

/** MQTT `channel` = quantidade de Start Pulses (SErPAy = S PLSE). 1 = modo SingL. */
constexpr int kMinChannel = 1;
constexpr int kMaxChannel = 32;
constexpr size_t kIdCap = 40;

bool parseIso8601(const char* s, int64_t& epochMs);

struct Command {
  char id[kIdCap];
  int channel;
  int64_t issuedMs;
  int64_t expiresMs;
};

enum class ParseResult { Ok, BadJson, NoId, Invalid };
ParseResult parseCommand(const char* json, size_t len, Command& cmd);

enum class Verdict { Execute, Duplicate, Expired, BadChannel, ClockNotSynced };
Verdict judge(const Command& cmd, bool alreadyExecuted, int64_t nowMs);

class RecentIds {
 public:
  static constexpr size_t kSize = 16;
  static constexpr size_t kBlobSize = kSize * kIdCap;
  bool has(const char* id) const;
  void add(const char* id);
  void remove(const char* id);
  const uint8_t* blob() const { return reinterpret_cast<const uint8_t*>(slots_); }
  void load(const uint8_t* data, size_t len);

 private:
  char slots_[kSize][kIdCap] = {};
  size_t next_ = 0;
};

size_t buildAck(char* out, size_t cap, const char* commandId, bool done, const char* reason);
void deviceIdFromMac(const uint8_t mac[6], char* out, size_t cap);

}  // namespace lav
