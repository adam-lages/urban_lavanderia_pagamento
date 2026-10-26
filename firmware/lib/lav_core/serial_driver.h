#pragma once
#include <stddef.h>
#include <stdint.h>
#include <functional>
#include "lav_core.h"
#include "release_driver.h"

namespace lav {

/** Transporte de bytes. Implementação real: UART2 (src/hw_serial_transport.h). Nos testes: um falso. */
class SerialTransport {
 public:
  virtual ~SerialTransport() {}
  virtual void begin() = 0;
  virtual int available() = 0;
  virtual int read() = 0;
  virtual size_t write(const uint8_t* data, size_t n) = 0;
};

/**
 * Driver serial da máquina LG (conector ESDUS / leitor de cartão, 6 fios).
 *
 * A máquina cobra o preço de vend r9Pr (hoje ALL = 100). Cicclo/VMPay/Nayax
 * só creditam esse valor; não existe “protocolo Cicclo” neste fio.
 * Pulso de moeda (50 ms, ~16,5 V) é OUTRO conector — não este driver.
 *
 * ESTADO ATUAL: bytes DESCONHECIDOS (manuais não publicam UART). O driver
 *  - escuta a serial (SNIFFER) e entrega cada quadro RX em hexadecimal ao `RxSink`;
 *  - NÃO libera máquina: start() sempre recusa com "serial_protocol_unknown".
 *
 * Quando a captura mostrar o crédito de 100, implemente buildReleaseFrame()
 * e troque start() para enviar o quadro; o restante do firmware não muda.
 * Não inventar frames. Não ligar 12,5 V no GPIO da ESP32.
 */
class SerialDriver : public ReleaseDriver {
 public:
  using RxSink = std::function<void(const char* hex, size_t bytes)>;

  SerialDriver(SerialTransport& transport, uint32_t gapMs, bool debugTxEnabled)
      : transport_(transport), chunker_(gapMs), debugTx_(debugTxEnabled) {}

  void setRxSink(RxSink sink) { sink_ = sink; }

  const char* name() const override { return debugTx_ ? "serial-sniffer-tx-debug" : "serial-sniffer"; }
  bool begin() override {
    transport_.begin();
    return true;
  }
  bool start(int channel, const char** reason) override;
  void loop(uint32_t nowMs) override;
  DriverState state() const override { return DriverState::Idle; }
  void acknowledge() override {}

  /** Envio de debug (bytes crus). Só funciona se compilado com SERIAL_DEBUG_TX=1. */
  bool debugSend(const uint8_t* data, size_t n);

  uint32_t rxBytes() const { return rxBytes_; }

  /**
   * STUB. `channel` = preço r9Pr (100, 200, … 1000). Sem captura, retorna 0.
   */
  static size_t buildReleaseFrame(int channel, uint8_t* out, size_t cap);

 private:
  void emit(const uint8_t* data, size_t n);
  SerialTransport& transport_;
  RxChunker chunker_;
  RxSink sink_;
  bool debugTx_;
  uint32_t rxBytes_ = 0;
};

}  // namespace lav
