#include <Adafruit_NeoPixel.h>

#define LED_PIN 5
#define NUM_LEDS 73
#define LED_BRIGHTNESS 80

// Fallback colours if an ON arrives without RGB (playing = green).
#define DEFAULT_WHITE_R 0
#define DEFAULT_WHITE_G 220
#define DEFAULT_WHITE_B 40
#define DEFAULT_BLACK_R 0
#define DEFAULT_BLACK_G 220
#define DEFAULT_BLACK_B 40

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// Counts overlapping ON events per LED so retriggered notes
// do not turn off too early.
int activeNotes[NUM_LEDS];
uint32_t ledColor[NUM_LEDS];

String inputLine;
bool pixelsDirty = false;

void showIfDirty() {
  if (!pixelsDirty) {
    return;
  }
  strip.show();
  pixelsDirty = false;
}

void clearAll() {
  for (int i = 0; i < NUM_LEDS; i++) {
    activeNotes[i] = 0;
    ledColor[i] = 0;
    strip.setPixelColor(i, 0);
  }
  // Apply immediately so Stop/CLEAR is not delayed by a pending show batch.
  strip.show();
  pixelsDirty = false;
}

void setLed(int led, bool on, uint8_t r, uint8_t g, uint8_t b) {
  if (led < 0 || led >= NUM_LEDS) {
    return;
  }

  if (on) {
    // One LED = one key. Don't stack counters on repeated ONs
    // (common in MIDI) or the LED never turns off.
    if (activeNotes[led] < 1) {
      activeNotes[led] = 1;
    }
    ledColor[led] = strip.Color(r, g, b);
    strip.setPixelColor(led, ledColor[led]);
  } else {
    activeNotes[led] = 0;
    ledColor[led] = 0;
    strip.setPixelColor(led, 0);
  }

  pixelsDirty = true;
}

void handleCommand(String line) {
  line.trim();
  if (line.length() == 0) {
    return;
  }

  if (line.equalsIgnoreCase("CLEAR")) {
    clearAll();
    return;
  }

  int first = line.indexOf(',');
  if (first <= 0) {
    return;
  }

  String action = line.substring(0, first);
  action.toUpperCase();

  int second = line.indexOf(',', first + 1);
  int led;
  uint8_t r = DEFAULT_WHITE_R;
  uint8_t g = DEFAULT_WHITE_G;
  uint8_t b = DEFAULT_WHITE_B;

  if (second < 0) {
    led = line.substring(first + 1).toInt();
  } else {
    led = line.substring(first + 1, second).toInt();
    int third = line.indexOf(',', second + 1);
    if (third < 0) {
      r = line.substring(second + 1).toInt();
    } else {
      r = line.substring(second + 1, third).toInt();
      int fourth = line.indexOf(',', third + 1);
      if (fourth < 0) {
        g = line.substring(third + 1).toInt();
      } else {
        g = line.substring(third + 1, fourth).toInt();
        b = line.substring(fourth + 1).toInt();
      }
    }
  }

  if (action == "ON") {
    setLed(led, true, r, g, b);
  } else if (action == "OFF") {
    setLed(led, false, 0, 0, 0);
  } else if (action == "SET") {
    // Preview / color update — does not change note counters.
    if (led < 0 || led >= NUM_LEDS) {
      return;
    }
    if (activeNotes[led] > 0) {
      return;
    }
    if (r == 0 && g == 0 && b == 0) {
      strip.setPixelColor(led, 0);
    } else {
      strip.setPixelColor(led, strip.Color(r, g, b));
    }
    pixelsDirty = true;
  }
}

void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(LED_BRIGHTNESS);
  clearAll();
  showIfDirty();
}

void loop() {
  // Process one command per loop iteration and show immediately.
  // This ensures every state change is visible, even rapid ON→OFF→ON sequences.
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputLine.length() > 0) {
        handleCommand(inputLine);
        inputLine = "";
        // Show immediately after every command so rapid sequences display all states.
        showIfDirty();
      }
    } else {
      inputLine += c;
      if (inputLine.length() > 64) {
        inputLine = "";
      }
    }
  }
}
