#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <esp_task_wdt.h>
#include <sys/time.h>
#include "config.h"
#include "lav_core.h"
#include "led_pattern.h"
#include "led_status.h"
#include "release_driver.h"
#include "status_led.h"

#if MQTT_USE_TLS
#include <WiFiClientSecure.h>
static WiFiClientSecure netClient;
#else
static WiFiClient netClient;
#endif

#if RELEASE_DRIVER == 1
#include "gpio_driver.h"
static GpioPulseDriver driverImpl(GPIO_RELEASE_PIN, GPIO_ACTIVE_LEVEL, GPIO_PULSE_MS);
static const char* kDriverName = "gpio";
#elif RELEASE_DRIVER == 2
#include "hw_serial_transport.h"
#include "serial_driver.h"
static HardwareSerialTransport serialTransport;
static lav::SerialDriver driverImpl(serialTransport, SERIAL_SNIFFER_GAP_MS, SERIAL_DEBUG_TX);
#else
#include "mock_driver.h"
static MockLedDriver driverImpl(MOCK_LED_PIN);
#endif
static lav::ReleaseDriver& driver = driverImpl;

static PubSubClient mqtt(netClient);
static Preferences prefs;
static lav::RecentIds recent;
static StatusLed statusLed;
static const lav::LedPattern kCmdPattern{CMD_BLINKS, CMD_BLINK_MS, CMD_HOLD_MS};
static uint32_t cmdLedStart = 0, errorLedUntil = 0;

static char deviceId[24];
static char topicCmd[48], topicAck[48], topicStatus[48], topicInfo[48], topicDebugRx[56], topicDebugCmd[56];
static char activeId[lav::kIdCap] = "";

static uint32_t wifiDownSince = 0, lastWifiTry = 0, mqttDownSince = 0, lastMqttTry = 0, lastBeat = 0, bootMs = 0;
static bool ntpStarted = false;

static int64_t nowEpochMs() {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  if (tv.tv_sec < 1700000000) return 0;  // relógio ainda não sincronizado
  return static_cast<int64_t>(tv.tv_sec) * 1000 + tv.tv_usec / 1000;
}

static void persistRecent() { prefs.putBytes("recent", recent.blob(), lav::RecentIds::kBlobSize); }

static void publishAck(const char* id, bool done, const char* reason = nullptr) {
  char buf[200];
  lav::buildAck(buf, sizeof(buf), id, done, reason);
  mqtt.publish(topicAck, buf);
  Serial.printf("[ack] %s\n", buf);
}

static void publishInfo() {
  JsonDocument doc;
  doc["fw"] = FW_VERSION;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["uptimeS"] = (millis() - bootMs) / 1000;
  doc["driver"] = driver.name();
  doc["freeHeap"] = ESP.getFreeHeap();
  char buf[256];
  serializeJson(doc, buf, sizeof(buf));
  mqtt.publish(topicInfo, buf);
}

static void handleCommand(const char* payload, size_t len) {
  lav::Command cmd;
  lav::ParseResult pr = lav::parseCommand(payload, len, cmd);
  if (pr == lav::ParseResult::BadJson || pr == lav::ParseResult::NoId) {
    Serial.println("[cmd] ignorado: JSON/commandId inválido");
    return;
  }
  if (pr == lav::ParseResult::Invalid) return publishAck(cmd.id, false, "invalid");

  const bool dup = recent.has(cmd.id);
  switch (lav::judge(cmd, dup, nowEpochMs())) {
    case lav::Verdict::Duplicate:
      // Ainda executando o mesmo comando: o ack "done" sai quando terminar.
      if (strcmp(cmd.id, activeId) != 0) publishAck(cmd.id, true);
      return;
    case lav::Verdict::ClockNotSynced: return publishAck(cmd.id, false, "clock_not_synced");
    case lav::Verdict::Expired: return publishAck(cmd.id, false, "expired");
    case lav::Verdict::BadChannel: return publishAck(cmd.id, false, "invalid_channel");
    case lav::Verdict::Execute: break;
  }
  if (activeId[0] || driver.state() == lav::DriverState::Busy) return publishAck(cmd.id, false, "busy");

  // Marca como executado ANTES de acionar: se a energia cair no meio, nunca repete.
  recent.add(cmd.id);
  persistRecent();
  const char* reason = "driver_error";
  if (!driver.start(cmd.channel, &reason)) {
    recent.remove(cmd.id);
    persistRecent();
    errorLedUntil = millis() + 3000;
    return publishAck(cmd.id, false, reason);
  }
  strncpy(activeId, cmd.id, sizeof(activeId) - 1);
  cmdLedStart = millis() ? millis() : 1;
  Serial.printf("[cmd] executando %s (canal %d)\n", cmd.id, cmd.channel);
}

#if RELEASE_DRIVER == 2
// Comando de debug: SOMENTE com SERIAL_DEBUG_TX=1. {"hex":"AA BB","confirm":"SEND"}
static void handleDebugCmd(const char* payload, size_t len) {
#if SERIAL_DEBUG_TX
  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) return;
  if (strcmp(doc["confirm"] | "", "SEND") != 0) return;
  uint8_t bytes[64];
  int n = lav::hexDecode(doc["hex"] | "", bytes, sizeof(bytes));
  if (n <= 0) return;
  bool ok = driverImpl.debugSend(bytes, n);
  Serial.printf("[debug-tx] %d bytes ok=%d\n", n, ok);
#else
  (void)payload;
  (void)len;
  Serial.println("[debug-tx] desativado neste firmware (SERIAL_DEBUG_TX=0)");
#endif
}
#endif

static void onMessage(char* topic, uint8_t* payload, unsigned int len) {
  if (strcmp(topic, topicCmd) == 0) return handleCommand(reinterpret_cast<const char*>(payload), len);
#if RELEASE_DRIVER == 2
  if (strcmp(topic, topicDebugCmd) == 0) return handleDebugCmd(reinterpret_cast<const char*>(payload), len);
#endif
}

static void restartIfStuck(uint32_t since, uint32_t limit, const char* what) {
  if (since && millis() - since > limit) {
    Serial.printf("[wdt] %s fora por muito tempo; reiniciando\n", what);
    delay(100);
    ESP.restart();
  }
}

static void serviceWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiDownSince = 0;
    if (!ntpStarted) {
      configTime(0, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
      ntpStarted = true;
    }
    return;
  }
  if (!wifiDownSince) wifiDownSince = millis() ? millis() : 1;
  restartIfStuck(wifiDownSince, WIFI_RESTART_AFTER_MS, "Wi-Fi");
  if (!lastWifiTry || millis() - lastWifiTry > WIFI_RETRY_MS) {
    lastWifiTry = millis() ? millis() : 1;
    Serial.println("[wifi] conectando...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

static void serviceMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  // Só fica online com relógio certo: a placa precisa validar expiresAt dos comandos.
  if (nowEpochMs() == 0) {
    restartIfStuck(bootMs ? bootMs : 1, NTP_WAIT_RESTART_MS, "NTP");
    return;
  }
  if (mqtt.connected()) {
    mqttDownSince = 0;
    return;
  }
  if (!mqttDownSince) mqttDownSince = millis() ? millis() : 1;
  restartIfStuck(mqttDownSince, MQTT_RESTART_AFTER_MS, "MQTT");
  if (lastMqttTry && millis() - lastMqttTry < MQTT_RETRY_MS) return;
  lastMqttTry = millis() ? millis() : 1;
  char clientId[32];
  snprintf(clientId, sizeof(clientId), "lav-%s", deviceId);
  const char* user = strlen(MQTT_USER) ? MQTT_USER : nullptr;
  const char* pass = strlen(MQTT_USER) ? MQTT_PASS : nullptr;
  // clean session = false: comandos QoS1 pendentes chegam quando a placa volta (a expiração protege).
  if (mqtt.connect(clientId, user, pass, topicStatus, 1, true, "offline", false)) {
    Serial.println("[mqtt] conectado");
    mqtt.subscribe(topicCmd, 1);
#if RELEASE_DRIVER == 2
    mqtt.subscribe(topicDebugCmd, 1);
#endif
    mqtt.publish(topicStatus, "online", true);
    publishInfo();
    lastBeat = millis();
  } else {
    Serial.printf("[mqtt] falhou rc=%d\n", mqtt.state());
  }
}

void setup() {
  driver.begin();  // primeiro: saída em estado seguro
  statusLed.begin();
  Serial.begin(115200);
  bootMs = millis();

  uint8_t mac[6];
  WiFi.mode(WIFI_STA);
  WiFi.macAddress(mac);
  lav::deviceIdFromMac(mac, deviceId, sizeof(deviceId));
  snprintf(topicCmd, sizeof(topicCmd), "lav/%s/cmd", deviceId);
  snprintf(topicAck, sizeof(topicAck), "lav/%s/ack", deviceId);
  snprintf(topicStatus, sizeof(topicStatus), "lav/%s/status", deviceId);
  snprintf(topicInfo, sizeof(topicInfo), "lav/%s/info", deviceId);
  snprintf(topicDebugRx, sizeof(topicDebugRx), "lav/%s/debug/rx", deviceId);
  snprintf(topicDebugCmd, sizeof(topicDebugCmd), "lav/%s/debug/cmd", deviceId);
  Serial.printf("\n== Urban Lavanderia fw %s | placa %s | driver %s ==\n", FW_VERSION, deviceId, driver.name());

  prefs.begin("lav", false);
  uint8_t blob[lav::RecentIds::kBlobSize];
  size_t got = prefs.getBytes("recent", blob, sizeof(blob));
  recent.load(blob, got);

  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.setHostname(deviceId);
#if MQTT_USE_TLS
#ifdef MQTT_CA_CERT
  netClient.setCACert(MQTT_CA_CERT);
#else
  netClient.setInsecure();
#endif
#endif
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setKeepAlive(MQTT_KEEPALIVE_S);
  mqtt.setSocketTimeout(5);
  mqtt.setBufferSize(768);

#if RELEASE_DRIVER == 2
  driverImpl.setRxSink([](const char* hex, size_t bytes) {
    if (!mqtt.connected()) return;
    char msg[360];
    snprintf(msg, sizeof(msg), "{\"t\":%lu,\"n\":%u,\"hex\":\"%s\"}", static_cast<unsigned long>(millis()),
             static_cast<unsigned>(bytes), hex);
    mqtt.publish(topicDebugRx, msg);
  });
#endif

  esp_task_wdt_init(WDT_TIMEOUT_S, true);
  esp_task_wdt_add(nullptr);
}

static bool everConnected = false;

static void updateStatusLed() {
  if (!StatusLed::enabled()) return;
  const uint32_t now = millis();
  const bool connected = mqtt.connected();
  if (connected) everConnected = true;
  if (cmdLedStart && kCmdPattern.finished(now - cmdLedStart)) cmdLedStart = 0;
  lav::LedInputs in{connected, everConnected, now - bootMs, cmdLedStart != 0, now - cmdLedStart,
                    static_cast<int32_t>(errorLedUntil - now) > 0};
  switch (lav::ledColor(in, kCmdPattern)) {
    case lav::RgbColor::Blue: statusLed.set(StatusLed::Blue); break;
    case lav::RgbColor::Green: statusLed.set(StatusLed::Green); break;
    case lav::RgbColor::Red: statusLed.set(StatusLed::Red); break;
    default: statusLed.set(StatusLed::Off); break;
  }
}

void loop() {
  esp_task_wdt_reset();
  serviceWifi();
  serviceMqtt();
  mqtt.loop();
  driver.loop(millis());

  if (activeId[0]) {
    lav::DriverState st = driver.state();
    if (st == lav::DriverState::Done) {
      publishAck(activeId, true);
      driver.acknowledge();
      activeId[0] = 0;
    } else if (st == lav::DriverState::Failed) {
      recent.remove(activeId);
      persistRecent();
      errorLedUntil = millis() + 3000;
      publishAck(activeId, false, "driver_failed");
      driver.acknowledge();
      activeId[0] = 0;
    }
  }

  updateStatusLed();

  if (mqtt.connected() && millis() - lastBeat >= HEARTBEAT_MS) {
    lastBeat = millis();
    publishInfo();
  }
}
