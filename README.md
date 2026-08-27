# Piano Tutor (Piano LED)

Light-guided piano practice: play MIDI from a web UI and light matching keys on a WS2812 LED strip over an Arduino.

Built for an **Alesis Q49** (49 keys, MIDI 36–84 / C2–C6) with a **73-LED** strip (LEDs 0–23 skipped; LED 24 = C2 … LED 72 = C6).

## Features

- Browse and play MIDIs from `archive/`
- Tempo control (BPM / rate), count-in, metronome, soft synth preview
- Arduino connect over serial (`ON` / `OFF` / `CLEAR`)
- LED color picker (saved in the browser)
- Key walk and chord hardware tests
- Live keyboard + LED strip visualization

## Hardware

| Piece | Notes |
| --- | --- |
| Arduino (UNO / Nano / similar) | USB serial @ **115200** |
| WS2812 / NeoPixel strip | **73** LEDs, data on **pin 5** (see sketch) |
| Alesis Q49 | Default octave (no OCTAVE +/-) |

Upload `arduino/piano_led/piano_led.ino` with the [Adafruit NeoPixel](https://github.com/adafruit/Adafruit_NeoPixel) library.

Serial protocol (one command per line):

```text
ON,<led>,<r>,<g>,<b>
OFF,<led>
CLEAR
```

## Setup

```bash
cd piano-led   # or piano-tutor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Default serial port on macOS is `/dev/cu.usbserial-110` (change in `player.py` or pick a port in the UI).

## Run the web UI

```bash
source .venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8000
```

Open **http://127.0.0.1:8000**

1. Connect the Arduino (choose the USB port)
2. Pick a piece from the quest log
3. Optionally set LED color
4. Play / pause / stop; adjust tempo as needed

## CLI playback

```bash
python midi_piano.py "Beethoven - Fur Elise.mid"
python midi_piano.py --port /dev/cu.usbserial-110 path/to/file.mid
```

## Project layout

```text
archive/                 MIDI library (.mid / .midi)
arduino/piano_led/       Firmware for the LED strip
static/                  Web UI (HTML / CSS / JS)
player.py                MIDI timeline, serial I/O, playback engine
server.py                FastAPI + WebSocket API
midi_piano.py            CLI entrypoint
```

## API (high level)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/files` | List archive MIDIs |
| POST | `/api/files` | Upload a MIDI |
| GET | `/api/ports` | List serial ports |
| POST | `/api/connect` | Open Arduino serial |
| POST | `/api/play` | Start a piece `{ "name": "…" }` |
| POST | `/api/pause` `/api/resume` `/api/stop` | Transport |
| POST | `/api/tempo` | `{ "rate" }` or `{ "bpm" }` |
| POST | `/api/color` | `{ "hex": "#00dc28" }` |
| WS | `/ws` | Live status / note events |

## Adding songs

Drop `.mid` / `.midi` files into `archive/`, or use **Import MIDI** in the UI. Prefer clear names like `Composer - Piece.mid`.

The bundled archive targets **500+** practice pieces (classical MIDI collections plus public-domain / research sets). Quality varies by source — prefer named classical titles when practicing by ear.

## License / credits

Application code is yours to use in this repo. MIDI files in `archive/` come from public classical MIDI sources (e.g. [piano-midi.de](http://www.piano-midi.de/)); respect each source’s terms for redistribution.
