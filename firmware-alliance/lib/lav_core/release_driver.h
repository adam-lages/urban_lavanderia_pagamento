#pragma once
#include <stdint.h>

namespace lav {

enum class DriverState { Idle, Busy, Done, Failed };

class ReleaseDriver {
 public:
  virtual ~ReleaseDriver() {}
  virtual const char* name() const = 0;
  virtual bool begin() = 0;
  virtual bool start(int channel, const char** reason) = 0;
  virtual void loop(uint32_t nowMs) = 0;
  virtual DriverState state() const = 0;
  virtual void acknowledge() = 0;
};

}  // namespace lav
