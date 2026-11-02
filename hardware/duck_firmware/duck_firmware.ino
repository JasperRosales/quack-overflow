/*
 * Quack Overflow — hardware duck firmware (ESP32, Arduino core 3.x)
 *
 * Serial protocol: 115200 baud, newline-terminated ASCII.
 *   Browser → duck : QUACK | THINK | CURIOUS | PARTY | SLEEP | IDLE | PING
 *   Duck → browser : READY (on boot and in reply to PING) | BTN_HINT (button pressed)
 *
 * Hardware (see hardware/wiring.md):
 *   - WS2812B ring/strip (3–8 LEDs) on LED_PIN
 *   - Sound: EITHER a passive buzzer on BUZZER_PIN (USE_I2S 0, budget option)
 *            OR a MAX98357A I2S amp + 3 W speaker (USE_I2S 1)
 *   - Optional "I'm stuck" push button between BUTTON_PIN and GND
 *
 * Libraries: Adafruit NeoPixel (Library Manager). ESP_I2S ships with the ESP32 core.
 * Everything is non-blocking so LEDs keep animating while the duck quacks.
 */
#include <Adafruit_NeoPixel.h>

// ---------------------------------------------------------------- config
#define USE_I2S 0          // 0 = passive buzzer, 1 = MAX98357A I2S amplifier
#define LED_PIN 5
#define LED_COUNT 8
#define BUTTON_PIN 4       // to GND, uses internal pull-up
#define BUZZER_PIN 25
#define I2S_BCLK 26
#define I2S_LRC 27
#define I2S_DOUT 22
#define BRIGHTNESS 80      // 0–255, keep it modest on USB power
#define SAMPLE_RATE 16000

#if USE_I2S
#include <ESP_I2S.h>
I2SClass i2s;
#endif

Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// ---------------------------------------------------------------- state
enum Mode { M_IDLE, M_THINK, M_CURIOUS, M_QUACK_FLASH, M_PARTY, M_SLEEP };
Mode mode = M_IDLE;
Mode modeAfterEffect = M_IDLE;   // QUACK/PARTY are temporary; return here after
unsigned long modeStarted = 0;
String line;

// ---------------------------------------------------------------- sound sequencer
struct Note { uint16_t f0, f1, ms; };   // frequency sweep f0 → f1 over ms (f0 = 0 → rest)
const uint8_t MAX_NOTES = 16;
Note queue[MAX_NOTES];
uint8_t qLen = 0, qPos = 0;
unsigned long noteStarted = 0;
bool playing = false;

void playNotes(const Note* notes, uint8_t n) {
  qLen = min(n, MAX_NOTES);
  for (uint8_t i = 0; i < qLen; i++) queue[i] = notes[i];
  qPos = 0;
  noteStarted = millis();
  playing = qLen > 0;
}

// A "quack" is a quick downward sweep; a curious "quack?" sweeps up at the end.
const Note QUACK_NOTES[] = { {720, 520, 70}, {560, 380, 110} };
const Note CURIOUS_NOTES[] = { {520, 460, 80}, {0, 0, 30}, {460, 760, 120} };
const Note PARTY_NOTES[] = {
  {720, 520, 70}, {560, 380, 90}, {0, 0, 80},
  {720, 520, 70}, {560, 380, 90}, {0, 0, 80},
  {720, 520, 70}, {560, 380, 90}, {0, 0, 120},
  {523, 523, 120}, {659, 659, 120}, {784, 784, 120}, {1047, 1047, 260},
};

uint16_t currentFreq(float& envelope) {
  if (!playing) { envelope = 0; return 0; }
  unsigned long now = millis();
  while (qPos < qLen && now - noteStarted >= queue[qPos].ms) {
    noteStarted += queue[qPos].ms;
    qPos++;
  }
  if (qPos >= qLen) { playing = false; envelope = 0; return 0; }
  const Note& n = queue[qPos];
  float t = (float)(now - noteStarted) / n.ms;
  envelope = t < 0.15f ? t / 0.15f : (1.0f - t) / 0.85f;   // quick attack, linear decay
  if (n.f0 == 0) return 0;
  return n.f0 + (int)((n.f1 - n.f0) * t);
}

#if USE_I2S
float phase = 0;
void updateSound() {
  float env;
  uint16_t f = currentFreq(env);
  if (!playing && f == 0) return;
  int16_t buf[128];
  for (int i = 0; i < 128; i++) {
    // Sawtooth with a little 2nd harmonic sounds reasonably duck-like.
    float s = f ? (2.0f * phase - 1.0f) * 0.7f + 0.3f * sinf(4.0f * PI * phase) : 0;
    buf[i] = (int16_t)(s * env * 9000);
    phase += (float)f / SAMPLE_RATE;
    if (phase >= 1.0f) phase -= 1.0f;
  }
  i2s.write((uint8_t*)buf, sizeof(buf));
}
#else
uint16_t lastTone = 0;
void updateSound() {
  float env;
  uint16_t f = currentFreq(env);
  if (env < 0.05f) f = 0;
  if (f != lastTone) {
    ledcWriteTone(BUZZER_PIN, f);
    lastTone = f;
  }
}
#endif

void setMode(Mode m) {
  mode = m;
  modeStarted = millis();
}

// ---------------------------------------------------------------- LEDs
uint32_t scale(uint8_t r, uint8_t g, uint8_t b, float k) {
  return strip.Color(r * k, g * k, b * k);
}

void fillAll(uint32_t c) {
  for (int i = 0; i < LED_COUNT; i++) strip.setPixelColor(i, c);
}

void updateLeds() {
  unsigned long t = millis() - modeStarted;
  switch (mode) {
    case M_IDLE: {                          // soft yellow breathing
      float k = 0.25f + 0.2f * (1 + sinf(t / 900.0f)) / 2;
      fillAll(scale(255, 190, 20, k));
      break;
    }
    case M_THINK: {                         // spinning blue
      strip.clear();
      int head = (t / 90) % LED_COUNT;
      for (int i = 0; i < 3; i++) strip.setPixelColor((head - i + LED_COUNT) % LED_COUNT, scale(30, 90, 255, 1.0f - i * 0.35f));
      break;
    }
    case M_CURIOUS: {                       // blinking yellow
      fillAll((t / 350) % 2 ? scale(255, 190, 20, 0.9f) : 0);
      break;
    }
    case M_QUACK_FLASH: {                   // white flash, then back
      fillAll(t < 250 ? strip.Color(255, 255, 255) : scale(255, 190, 20, 0.6f));
      if (t > 600) setMode(modeAfterEffect);
      break;
    }
    case M_PARTY: {                         // rainbow chase for 3 s
      for (int i = 0; i < LED_COUNT; i++) {
        uint16_t hue = (t * 40 + i * 65536L / LED_COUNT) & 0xFFFF;
        strip.setPixelColor(i, strip.gamma32(strip.ColorHSV(hue)));
      }
      if (t > 3000) setMode(M_IDLE);
      break;
    }
    case M_SLEEP: {                         // dim
      fillAll(scale(255, 160, 20, 0.05f));
      break;
    }
  }
  strip.show();
}

// ---------------------------------------------------------------- commands
void handleCommand(const String& raw) {
  String cmd = raw;
  cmd.trim();
  cmd.toUpperCase();
  if (cmd == "IDLE") setMode(M_IDLE);
  else if (cmd == "THINK") setMode(M_THINK);
  else if (cmd == "CURIOUS") { setMode(M_CURIOUS); playNotes(CURIOUS_NOTES, 3); }
  else if (cmd == "QUACK") {
    modeAfterEffect = (mode == M_QUACK_FLASH || mode == M_PARTY) ? M_IDLE : mode;
    setMode(M_QUACK_FLASH);
    playNotes(QUACK_NOTES, 2);
  }
  else if (cmd == "PARTY") { setMode(M_PARTY); playNotes(PARTY_NOTES, 13); }
  else if (cmd == "SLEEP") setMode(M_SLEEP);
  else if (cmd == "PING") Serial.println("READY");
}

// ---------------------------------------------------------------- button
bool lastBtn = HIGH;
unsigned long lastBtnChange = 0;

void updateButton() {
  bool b = digitalRead(BUTTON_PIN);
  if (b != lastBtn && millis() - lastBtnChange > 40) {   // debounce
    lastBtnChange = millis();
    lastBtn = b;
    if (b == LOW) {
      Serial.println("BTN_HINT");
      handleCommand("CURIOUS");
    }
  }
}

// ---------------------------------------------------------------- setup / loop
void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.show();
#if USE_I2S
  i2s.setPins(I2S_BCLK, I2S_LRC, I2S_DOUT);
  if (!i2s.begin(I2S_MODE_STD, SAMPLE_RATE, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) {
    Serial.println("ERR_I2S");
  }
#else
  ledcAttach(BUZZER_PIN, 2000, 8);
#endif
  setMode(M_IDLE);
  playNotes(QUACK_NOTES, 2);
  Serial.println("READY");
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (line.length()) handleCommand(line);
      line = "";
    } else if (line.length() < 32) {
      line += c;
    }
  }
  updateButton();
  updateSound();
  updateLeds();
#if !USE_I2S
  delay(5);
#endif
}
