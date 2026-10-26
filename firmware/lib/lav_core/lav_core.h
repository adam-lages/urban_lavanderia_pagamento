// Lógica sem dependência de Arduino: roda na ESP32 e nos testes nativos (pio test -e native).
#pragma once
#include <stddef.h>
#include <stdint.h>

namespace lav {

constexpr int kMinChannel = 100;
constexpr int kMaxChannel = 1000;
constexpr size_t kIdCap = 40;  // UUID (36) + '\0'

/** "2026-10-26T17:00:00.000Z" -> ms desde 1970 (UTC). */
bool parseIso8601(const char* s, int64_t& epochMs);

struct Command {
  char id[kIdCap];
  int channel;
  int64_t issuedMs;
  int64_t expiresMs;
};

enum class ParseResult { Ok, BadJson, NoId, Invalid };
/** `cmd.id` fica preenchido quando possível (permite responder rejected). */
ParseResult parseCommand(const char* json, size_t len, Command& cmd);

enum class Verdict { Execute, Duplicate, Expired, BadChannel, ClockNotSynced };
/** `nowMs` = 0 significa relógio não sincronizado. */
Verdict judge(const Command& cmd, bool alreadyExecuted, int64_t nowMs);

/** Últimos commandIds executados (anel). Serializável para a memória não volátil. */
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

/** JSON do ack: {"commandId":"..","status":"done|rejected","reason":".."} */
size_t buildAck(char* out, size_t cap, const char* commandId, bool done, const char* reason);
/** deviceId estável a partir do MAC: "esp-aabbccddeeff". */
void deviceIdFromMac(const uint8_t mac[6], char* out, size_t cap);

/** Bytes -> "AA BB CC". Retorna nº de caracteres (sem o '\0'). */
size_t hexEncode(const uint8_t* data, size_t n, char* out, size_t cap);
/** "AA bb 0xCC" (espaços e 0x ignorados) -> bytes. Retorna -1 se inválido. */
int hexDecode(const char* s, uint8_t* out, size_t cap);

/** Junta bytes recebidos em "quadros" quando a linha fica ociosa por gapMs (ou o buffer enche). */
class RxChunker {
 public:
  static constexpr size_t kCap = 96;
  explicit RxChunker(uint32_t gapMs) : gapMs_(gapMs) {}
  /** Guarda o byte. Se isso completou um quadro (pausa anterior ou buffer cheio), copia para `out` e retorna true. */
  bool push(uint8_t b, uint32_t nowMs, uint8_t* out, size_t& n);
  /** Chame periodicamente: entrega o quadro pendente quando a linha ficou ociosa. */
  bool idleFlush(uint32_t nowMs, uint8_t* out, size_t& n);

 private:
  uint8_t buf_[kCap];
  size_t len_ = 0;
  uint32_t lastMs_ = 0;
  uint32_t gapMs_;
  size_t take(uint8_t* out);
};

}  // namespace lav
