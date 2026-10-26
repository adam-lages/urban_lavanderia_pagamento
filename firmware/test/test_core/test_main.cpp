#include <unity.h>
#include <string.h>
#include <string>
#include <vector>
#include "lav_core.h"
#include "led_pattern.h"
#include "led_status.h"
#include "serial_driver.h"

using namespace lav;

void setUp() {}
void tearDown() {}

static const char* kCmd =
    "{\"commandId\":\"11111111-2222-3333-4444-555555555555\",\"channel\":100,"
    "\"issuedAt\":\"2026-10-26T17:00:00.000Z\",\"expiresAt\":\"2026-10-26T17:01:00.000Z\"}";

void test_iso8601() {
  int64_t ms = 0;
  TEST_ASSERT_TRUE(parseIso8601("1970-01-01T00:00:01.500Z", ms));
  TEST_ASSERT_EQUAL_INT64(1500, ms);
  TEST_ASSERT_TRUE(parseIso8601("2026-10-26T17:00:00.000Z", ms));
  TEST_ASSERT_EQUAL_INT64(1793034000000LL, ms);
  TEST_ASSERT_TRUE(parseIso8601("2024-02-29T00:00:00Z", ms));
  TEST_ASSERT_EQUAL_INT64(1709164800000LL, ms);
  TEST_ASSERT_FALSE(parseIso8601("2026-10-26 17:00:00", ms));
  TEST_ASSERT_FALSE(parseIso8601("lixo", ms));
}

void test_led_pattern() {
  LedPattern p{3, 150, 2000};
  TEST_ASSERT_EQUAL_UINT32(2900, p.totalMs());
  TEST_ASSERT_TRUE(p.isOn(0));
  TEST_ASSERT_FALSE(p.isOn(150));
  TEST_ASSERT_TRUE(p.isOn(300));
  TEST_ASSERT_FALSE(p.isOn(750));
  TEST_ASSERT_TRUE(p.isOn(900));
  TEST_ASSERT_TRUE(p.isOn(2899));
  TEST_ASSERT_FALSE(p.finished(2899));
  TEST_ASSERT_TRUE(p.finished(2900));
  TEST_ASSERT_FALSE(p.isOn(2900));
}

void test_led_color_states() {
  LedPattern p{3, 150, 2000};
  LedInputs in{true, true, 100000, false, 0, false};
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Blue), static_cast<int>(ledColor(in, p)));
  in.cmdActive = true;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Green), static_cast<int>(ledColor(in, p)));
  in.cmdElapsedMs = 150;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Off), static_cast<int>(ledColor(in, p)));
  in.cmdElapsedMs = 1500;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Green), static_cast<int>(ledColor(in, p)));
  in.cmdElapsedMs = 5000;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Blue), static_cast<int>(ledColor(in, p)));
  in.cmdActive = false;
  in.errorActive = true;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Red), static_cast<int>(ledColor(in, p)));
  in = LedInputs{false, true, 100000, false, 0, false};
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Red), static_cast<int>(ledColor(in, p)));
  in = LedInputs{false, false, 100, false, 0, false};
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Blue), static_cast<int>(ledColor(in, p)));
  in.sinceBootMs = 600;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Off), static_cast<int>(ledColor(in, p)));
  in.sinceBootMs = 40000;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Red), static_cast<int>(ledColor(in, p)));
}

void test_parse_command() {
  Command c;
  TEST_ASSERT_EQUAL(ParseResult::Ok, parseCommand(kCmd, strlen(kCmd), c));
  TEST_ASSERT_EQUAL_STRING("11111111-2222-3333-4444-555555555555", c.id);
  TEST_ASSERT_EQUAL(100, c.channel);
  TEST_ASSERT_EQUAL_INT64(60000, c.expiresMs - c.issuedMs);
  TEST_ASSERT_EQUAL(ParseResult::BadJson, parseCommand("{nope", 5, c));
  const char* noId = "{\"channel\":100}";
  TEST_ASSERT_EQUAL(ParseResult::NoId, parseCommand(noId, strlen(noId), c));
  const char* bad = "{\"commandId\":\"x\",\"channel\":100}";
  TEST_ASSERT_EQUAL(ParseResult::Invalid, parseCommand(bad, strlen(bad), c));
  TEST_ASSERT_EQUAL_STRING("x", c.id);
}

void test_judge() {
  Command c;
  parseCommand(kCmd, strlen(kCmd), c);
  int64_t before = c.issuedMs + 1000, after = c.expiresMs + 1;
  TEST_ASSERT_EQUAL(Verdict::Execute, judge(c, false, before));
  TEST_ASSERT_EQUAL(Verdict::Expired, judge(c, false, after));
  TEST_ASSERT_EQUAL(Verdict::Expired, judge(c, false, c.expiresMs));
  TEST_ASSERT_EQUAL(Verdict::Duplicate, judge(c, true, after));
  TEST_ASSERT_EQUAL(Verdict::ClockNotSynced, judge(c, false, 0));
  c.channel = 50;
  TEST_ASSERT_EQUAL(Verdict::BadChannel, judge(c, false, before));
  c.channel = 1001;
  TEST_ASSERT_EQUAL(Verdict::BadChannel, judge(c, false, before));
}

void test_recent_ids() {
  RecentIds r;
  TEST_ASSERT_FALSE(r.has("a"));
  r.add("a");
  r.add("a");
  TEST_ASSERT_TRUE(r.has("a"));
  r.remove("a");
  TEST_ASSERT_FALSE(r.has("a"));
  for (int i = 0; i < 20; i++) {
    char id[8];
    snprintf(id, sizeof(id), "id%d", i);
    r.add(id);
  }
  TEST_ASSERT_FALSE(r.has("id3"));  // saiu do anel
  TEST_ASSERT_TRUE(r.has("id19"));
  RecentIds copy;
  copy.load(r.blob(), RecentIds::kBlobSize);
  TEST_ASSERT_TRUE(copy.has("id19"));
  TEST_ASSERT_TRUE(copy.has("id4"));
  copy.add("novo");
  TEST_ASSERT_TRUE(copy.has("id19"));  // próximo slot não apaga o mais recente
}

void test_ack_and_id() {
  char out[160];
  buildAck(out, sizeof(out), "abc", true, nullptr);
  TEST_ASSERT_EQUAL_STRING("{\"commandId\":\"abc\",\"status\":\"done\"}", out);
  buildAck(out, sizeof(out), "abc", false, "expired");
  TEST_ASSERT_EQUAL_STRING("{\"commandId\":\"abc\",\"status\":\"rejected\",\"reason\":\"expired\"}", out);
  const uint8_t mac[6] = {0xA4, 0xCF, 0x12, 0x0B, 0x00, 0xFF};
  char id[24];
  deviceIdFromMac(mac, id, sizeof(id));
  TEST_ASSERT_EQUAL_STRING("esp-a4cf120b00ff", id);
}

void test_hex() {
  const uint8_t b[] = {0x02, 0xAB, 0xFF};
  char out[16];
  hexEncode(b, 3, out, sizeof(out));
  TEST_ASSERT_EQUAL_STRING("02 AB FF", out);
  uint8_t d[8];
  TEST_ASSERT_EQUAL(3, hexDecode("02 ab 0xFF", d, sizeof(d)));
  TEST_ASSERT_EQUAL_UINT8(0xAB, d[1]);
  TEST_ASSERT_EQUAL(-1, hexDecode("0G", d, sizeof(d)));
  TEST_ASSERT_EQUAL(-1, hexDecode("01 02 03", d, 2));
}

void test_chunker() {
  RxChunker c(20);
  uint8_t out[RxChunker::kCap];
  size_t n = 0;
  TEST_ASSERT_FALSE(c.push(1, 100, out, n));
  TEST_ASSERT_FALSE(c.push(2, 105, out, n));
  TEST_ASSERT_FALSE(c.idleFlush(110, out, n));
  TEST_ASSERT_TRUE(c.idleFlush(130, out, n));
  TEST_ASSERT_EQUAL(2, n);
  TEST_ASSERT_FALSE(c.idleFlush(200, out, n));
  c.push(9, 300, out, n);
  TEST_ASSERT_TRUE(c.push(8, 400, out, n));  // pausa antes do byte 8 fecha o quadro {9}
  TEST_ASSERT_EQUAL(1, n);
  TEST_ASSERT_EQUAL_UINT8(9, out[0]);
}

struct FakeTransport : SerialTransport {
  std::vector<uint8_t> rx, tx;
  size_t pos = 0;
  void begin() override {}
  int available() override { return rx.size() - pos; }
  int read() override { return pos < rx.size() ? rx[pos++] : -1; }
  size_t write(const uint8_t* d, size_t n) override {
    tx.insert(tx.end(), d, d + n);
    return n;
  }
};

void test_serial_sniffer() {
  FakeTransport t;
  SerialDriver drv(t, 20, false);
  std::vector<std::string> frames;
  drv.setRxSink([&](const char* hex, size_t) { frames.push_back(hex); });
  drv.begin();
  t.rx = {0x02, 0x10, 0x03};
  drv.loop(1000);
  TEST_ASSERT_EQUAL(0, frames.size());
  drv.loop(1050);
  TEST_ASSERT_EQUAL(1, frames.size());
  TEST_ASSERT_EQUAL_STRING("02 10 03", frames[0].c_str());
  TEST_ASSERT_EQUAL(3, drv.rxBytes());
}

void test_serial_never_releases_or_sends_by_default() {
  FakeTransport t;
  SerialDriver drv(t, 20, false);
  const char* reason = nullptr;
  TEST_ASSERT_FALSE(drv.start(100, &reason));
  TEST_ASSERT_EQUAL_STRING("serial_protocol_unknown", reason);
  const uint8_t data[] = {1, 2};
  TEST_ASSERT_FALSE(drv.debugSend(data, 2));
  TEST_ASSERT_EQUAL(0, t.tx.size());
  TEST_ASSERT_EQUAL(DriverState::Idle, drv.state());
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_iso8601);
  RUN_TEST(test_parse_command);
  RUN_TEST(test_judge);
  RUN_TEST(test_recent_ids);
  RUN_TEST(test_ack_and_id);
  RUN_TEST(test_hex);
  RUN_TEST(test_led_pattern);
  RUN_TEST(test_led_color_states);
  RUN_TEST(test_chunker);
  RUN_TEST(test_serial_sniffer);
  RUN_TEST(test_serial_never_releases_or_sends_by_default);
  return UNITY_END();
}
