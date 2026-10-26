#pragma once
#include <stdint.h>

namespace lav {

enum class DriverState { Idle, Busy, Done, Failed };

/**
 * "Driver de liberação": a única parte que sabe COMO liberar a máquina.
 * Trocar o driver (mock, GPIO, serial) não muda Wi-Fi, MQTT, idempotência nem ack.
 */
class ReleaseDriver {
 public:
  virtual ~ReleaseDriver() {}
  virtual const char* name() const = 0;
  /** Deve deixar a saída em estado SEGURO (inativo). */
  virtual bool begin() = 0;
  /** Inicia a liberação sem bloquear. Em falha, retorna false e aponta o motivo (texto curto sem espaços). */
  virtual bool start(int channel, const char** reason) = 0;
  /** Chamado a cada volta do loop principal. */
  virtual void loop(uint32_t nowMs) = 0;
  /** Done/Failed ficam até acknowledge(). */
  virtual DriverState state() const = 0;
  virtual void acknowledge() = 0;
};

}  // namespace lav
