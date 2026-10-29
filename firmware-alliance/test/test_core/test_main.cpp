#include <unity.h>
#include <string.h>
#include "lav_core.h"
#include "led_pattern.h"
#include "led_status.h"
#include "pulse_train.h"

using namespace lav;

void setUp() {}
void tearDown() {}

static const char* kCmd =
    "{\"commandId\":\"11111111-2222-3333-4444-555555555555\",\"channel\":1,"
    "\"issuedAt\":\"2026-10-26T17:00:00.000Z\",\"expiresAt\":\"2026-10-26T17:01:00.000Z\"}";

void test_iso8601() {
  int64_t ms = 0;
  TEST_ASSERT_TRUE(parseIso8601("1970-01-01T00:00:01.500Z", ms));
  TEST_ASSERT_EQUAL_INT64(1500, ms);
  TEST_ASSERT_TRUE(parseIso8601("2026-10-26T17:00:00.000Z", ms));
  TEST_ASSERT_EQUAL_INT64(1793034000000LL, ms);
  TEST_ASSERT_FALSE(parseIso8601("2026-10-26 17:00:00", ms));
}

void test_led_pattern() {
  LedPattern p{3, 150, 2000};
  TEST_ASSERT_EQUAL_UINT32(2900, p.totalMs());
  TEST_ASSERT_TRUE(p.isOn(0));
  TEST_ASSERT_FALSE(p.isOn(150));
  TEST_ASSERT_TRUE(p.finished(2900));
}

void test_led_color_states() {
  LedPattern p{3, 150, 2000};
  LedInputs in{true, true, 100000, false, 0, false};
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Blue), static_cast<int>(ledColor(in, p)));
  in.cmdActive = true;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Green), static_cast<int>(ledColor(in, p)));
  in.errorActive = true;
  in.cmdActive = false;
  TEST_ASSERT_EQUAL(static_cast<int>(RgbColor::Red), static_cast<int>(ledColor(in, p)));
}

void test_parse_command() {
  Command c;
  TEST_ASSERT_EQUAL(ParseResult::Ok, parseCommand(kCmd, strlen(kCmd), c));
  TEST_ASSERT_EQUAL_STRING("11111111-2222-3333-4444-555555555555", c.id);
  TEST_ASSERT_EQUAL(1, c.channel);
  TEST_ASSERT_EQUAL(ParseResult::BadJson, parseCommand("{nope", 5, c));
}

void test_judge() {
  Command c;
  parseCommand(kCmd, strlen(kCmd), c);
  int64_t before = c.issuedMs + 1000, after = c.expiresMs + 1;
  TEST_ASSERT_EQUAL(Verdict::Execute, judge(c, false, before));
  TEST_ASSERT_EQUAL(Verdict::Expired, judge(c, false, after));
  TEST_ASSERT_EQUAL(Verdict::Duplicate, judge(c, true, after));
  TEST_ASSERT_EQUAL(Verdict::ClockNotSynced, judge(c, false, 0));
  c.channel = 0;
  TEST_ASSERT_EQUAL(Verdict::BadChannel, judge(c, false, before));
  c.channel = 33;
  TEST_ASSERT_EQUAL(Verdict::BadChannel, judge(c, false, before));
  c.channel = 32;
  TEST_ASSERT_EQUAL(Verdict::Execute, judge(c, false, before));
}

void test_recent_ids() {
  RecentIds r;
  r.add("a");
  TEST_ASSERT_TRUE(r.has("a"));
  r.remove("a");
  TEST_ASSERT_FALSE(r.has("a"));
}

void test_ack_and_id() {
  char out[160];
  buildAck(out, sizeof(out), "abc", true, nullptr);
  TEST_ASSERT_EQUAL_STRING("{\"commandId\":\"abc\",\"status\":\"done\"}", out);
  const uint8_t mac[6] = {0xA4, 0xCF, 0x12, 0x0B, 0x00, 0xFF};
  char id[24];
  deviceIdFromMac(mac, id, sizeof(id));
  TEST_ASSERT_EQUAL_STRING("esp-a4cf120b00ff", id);
}

void test_pulse_train_single() {
  PulseTrain t;
  TEST_ASSERT_TRUE(t.start(1, 50, 50, 1000));
  TEST_ASSERT_TRUE(t.outputActive());
  t.tick(1049);
  TEST_ASSERT_TRUE(t.outputActive());
  TEST_ASSERT_FALSE(t.finished());
  t.tick(1050);
  TEST_ASSERT_FALSE(t.outputActive());
  TEST_ASSERT_TRUE(t.finished());
}

void test_pulse_train_three() {
  PulseTrain t;
  TEST_ASSERT_TRUE(t.start(3, 50, 50, 0));
  TEST_ASSERT_TRUE(t.outputActive());
  t.tick(50);
  TEST_ASSERT_FALSE(t.outputActive());
  t.tick(99);
  TEST_ASSERT_FALSE(t.outputActive());
  t.tick(100);
  TEST_ASSERT_TRUE(t.outputActive());
  t.tick(150);
  TEST_ASSERT_FALSE(t.outputActive());
  t.tick(200);
  TEST_ASSERT_TRUE(t.outputActive());
  t.tick(250);
  TEST_ASSERT_FALSE(t.outputActive());
  TEST_ASSERT_TRUE(t.finished());
  TEST_ASSERT_FALSE(t.busy());
  TEST_ASSERT_TRUE(t.start(1, 50, 50, 300));
  TEST_ASSERT_TRUE(t.outputActive());
}

void test_pulse_train_rejects_zero_and_busy() {
  PulseTrain t;
  TEST_ASSERT_FALSE(t.start(0, 50, 50, 0));
  TEST_ASSERT_TRUE(t.start(2, 50, 50, 0));
  TEST_ASSERT_FALSE(t.start(1, 50, 50, 10));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_iso8601);
  RUN_TEST(test_parse_command);
  RUN_TEST(test_judge);
  RUN_TEST(test_recent_ids);
  RUN_TEST(test_ack_and_id);
  RUN_TEST(test_led_pattern);
  RUN_TEST(test_led_color_states);
  RUN_TEST(test_pulse_train_single);
  RUN_TEST(test_pulse_train_three);
  RUN_TEST(test_pulse_train_rejects_zero_and_busy);
  return UNITY_END();
}
