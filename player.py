import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import mido
import serial
from serial.tools import list_ports


SERIAL_PORT = "/dev/cu.usbserial-110"
BAUD_RATE = 115200

# Alesis Q49 — 49 keys, default octave (no OCTAVE +/-): C2 → C6
KEYBOARD_NAME = "Alesis Q49"
FIRST_MIDI_NOTE = 36  # C2
LAST_MIDI_NOTE = 84   # C6
NUM_PIANO_KEYS = LAST_MIDI_NOTE - FIRST_MIDI_NOTE + 1  # 49

# Skip this many LEDs before the leftmost Q49 key (C2).
LED_OFFSET = 24

# Full Q49 array: 24 skipped + 49 keys.
FULL_LED_OFFSET = LED_OFFSET
FULL_NUM_LEDS = FULL_LED_OFFSET + NUM_PIANO_KEYS  # 73

# Bench / partial strip: same skip, then the first N keys.
TEST_LED_OFFSET = LED_OFFSET
TEST_KEY_COUNT = 8
TEST_NUM_LEDS = TEST_LED_OFFSET + TEST_KEY_COUNT  # 32

NUM_LEDS = FULL_NUM_LEDS
FOLD_TO_STRIP = False
TOTAL_LEDS = FULL_NUM_LEDS

ARCHIVE_DIR = Path(__file__).resolve().parent / "archive"
MIDI_SUFFIXES = {".mid", ".midi"}

PRESETS = {
    "q49": {
        "name": "q49",
        "label": "Alesis Q49 (49 keys)",
        "led_offset": FULL_LED_OFFSET,
        "num_leds": FULL_NUM_LEDS,
        "fold_to_strip": False,
        "hint": "Skip LED 0–23. LED 24=C2 … LED 72=C6 (Q49 default octave).",
    },
    "test-8": {
        "name": "test-8",
        "label": "8 keys after skip",
        "led_offset": TEST_LED_OFFSET,
        "num_leds": TEST_NUM_LEDS,
        "fold_to_strip": False,
        "hint": "Skip LED 0–23. LED 24=C2 … LED 31=G2.",
    },
}


@dataclass
class Event:
    time: float
    message_type: str
    led: int
    midi_note: int


@dataclass
class PlayerStatus:
    playing: bool = False
    paused: bool = False
    file: str | None = None
    title: str | None = None
    elapsed: float = 0.0
    duration: float = 0.0
    events: int = 0
    arduino: bool = False
    port: str | None = None
    error: str | None = None
    active_notes: list[int] = field(default_factory=list)


def midi_to_led(note: int, offset: int = LED_OFFSET) -> int | None:
    """
    One LED per Alesis Q49 key, left → right, after a skipped prefix.

    With offset 24 (Q49 default octave, no OCTAVE +/-):
      LED 0–23     skipped
      LED 24       C2  (leftmost white)
      LED 25       C#2 (black)
      ...
      LED 72       C6
    """
    if FIRST_MIDI_NOTE <= note <= LAST_MIDI_NOTE:
        return (note - FIRST_MIDI_NOTE) + offset
    return None


def physical_led(
    midi_note: int,
    led: int,
    *,
    num_leds: int,
    fold_to_strip: bool,
) -> int | None:
    """Map a logical piano LED onto the connected physical strip."""
    if num_leds <= 0:
        return None
    if fold_to_strip:
        return (midi_note - FIRST_MIDI_NOTE) % num_leds
    if 0 <= led < num_leds:
        return led
    return None


NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def midi_note_name(note: int) -> str:
    name = NOTE_NAMES[note % 12]
    octave = (note // 12) - 1
    return f"{name}{octave}"


def keys_on_strip(offset: int, num_leds: int) -> list[int]:
    """MIDI notes whose LEDs exist on the current physical strip."""
    notes = []
    for note in range(FIRST_MIDI_NOTE, LAST_MIDI_NOTE + 1):
        led = midi_to_led(note, offset)
        if led is not None and 0 <= led < num_leds:
            notes.append(note)
    return notes


def build_timeline(mid: mido.MidiFile, offset: int = LED_OFFSET) -> list[Event]:
    events: list[Event] = []
    current_time = 0.0

    for message in mid:
        current_time += message.time

        if message.type == "note_on" and message.velocity > 0:
            led = midi_to_led(message.note, offset)
            if led is not None:
                events.append(
                    Event(
                        time=current_time,
                        message_type="ON",
                        led=led,
                        midi_note=message.note,
                    )
                )

        elif message.type == "note_off" or (
            message.type == "note_on" and message.velocity == 0
        ):
            led = midi_to_led(message.note, offset)
            if led is not None:
                events.append(
                    Event(
                        time=current_time,
                        message_type="OFF",
                        led=led,
                        midi_note=message.note,
                    )
                )

    return close_hanging_notes(events)


def close_hanging_notes(events: list[Event]) -> list[Event]:
    """Append OFF for any note still held at the end (missing note-offs)."""
    open_notes: dict[int, Event] = {}
    for event in events:
        if event.message_type == "ON":
            open_notes[event.midi_note] = event
        else:
            open_notes.pop(event.midi_note, None)

    if not open_notes:
        return events

    end_time = events[-1].time if events else 0.0
    # Do not re-sort the whole timeline — equal-time order must stay as MIDI wrote it.
    extras = [
        Event(
            time=end_time,
            message_type="OFF",
            led=event.led,
            midi_note=event.midi_note,
        )
        for event in open_notes.values()
    ]
    return list(events) + extras


def is_midi_file(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in MIDI_SUFFIXES


def list_archive_files() -> list[Path]:
    ARCHIVE_DIR.mkdir(exist_ok=True)
    files = [path for path in ARCHIVE_DIR.iterdir() if is_midi_file(path)]
    return sorted(files, key=lambda path: path.name.lower())


def resolve_archive_file(name: str) -> Path:
    ARCHIVE_DIR.mkdir(exist_ok=True)
    candidate = Path(name).name
    path = (ARCHIVE_DIR / candidate).resolve()
    archive = ARCHIVE_DIR.resolve()
    if archive not in path.parents and path != archive:
        raise ValueError("Invalid file path.")
    if not is_midi_file(path):
        raise FileNotFoundError(f"MIDI file not found: {candidate}")
    return path


_inspect_cache: dict[tuple, dict] = {}

DEFAULT_BPM = 120.0
MIN_TEMPO_RATE = 0.5
MAX_TEMPO_RATE = 1.5


def extract_midi_meta(mid: mido.MidiFile) -> dict:
    """Read initial tempo, key, and time signature from a MIDI file."""
    tempo_at: list[tuple[int, int]] = []
    key_at: list[tuple[int, str]] = []
    meter_at: list[tuple[int, int, int]] = []

    for track in mid.tracks:
        tick = 0
        for message in track:
            tick += message.time
            if message.type == "set_tempo":
                tempo_at.append((tick, message.tempo))
            elif message.type == "key_signature":
                key_at.append((tick, message.key))
            elif message.type == "time_signature":
                meter_at.append((tick, message.numerator, message.denominator))

    bpm = DEFAULT_BPM
    if tempo_at:
        tempo_at.sort(key=lambda item: item[0])
        bpm = float(mido.tempo2bpm(tempo_at[0][1]))

    key = None
    if key_at:
        key_at.sort(key=lambda item: item[0])
        key = key_at[0][1]

    numerator, denominator = 4, 4
    if meter_at:
        meter_at.sort(key=lambda item: item[0])
        _, numerator, denominator = meter_at[0]

    return {
        "bpm": round(bpm, 2),
        "key": key,
        "time_signature": f"{numerator}/{denominator}",
        "beats_per_bar": int(numerator),
        "ticks_per_beat": int(mid.ticks_per_beat),
    }


def clamp_tempo_rate(rate: float) -> float:
    return max(MIN_TEMPO_RATE, min(MAX_TEMPO_RATE, float(rate)))


def inspect_midi(path: Path) -> dict:
    stat = path.stat()
    cache_key = (str(path), stat.st_mtime_ns, stat.st_size)
    cached = _inspect_cache.get(cache_key)
    if cached is not None:
        return cached

    mid = mido.MidiFile(path)
    events = build_timeline(mid, FULL_LED_OFFSET)
    duration = float(getattr(mid, "length", 0.0) or 0.0)
    if events:
        duration = max(duration, events[-1].time)

    meta = extract_midi_meta(mid)
    info = {
        "name": path.name,
        "title": path.stem,
        "duration": duration,
        "events": len(events),
        "tracks": len(mid.tracks),
        **meta,
    }
    _inspect_cache[cache_key] = info
    return info


def list_serial_ports() -> list[dict]:
    ports = []
    for port in list_ports.comports():
        ports.append(
            {
                "device": port.device,
                "description": port.description or "",
                "usb": "usb" in (port.device + (port.description or "")).lower(),
            }
        )
    return ports


def send_command(arduino: serial.Serial, command: str, *, flush: bool = False) -> None:
    arduino.write(f"{command}\n".encode("ascii"))
    if flush:
        arduino.flush()
    # 3ms delay ensures Arduino completes strip.show() before next command.
    # WS2812 show() takes ~1-2ms for 73 LEDs, so this prevents batching
    # rapid ON→OFF→ON sequences into a single display update.
    time.sleep(0.003)


def is_black_key(midi_note: int) -> bool:
    return (midi_note % 12) in {1, 3, 6, 8, 10}


DEFAULT_LED_RGB = (0, 220, 40)


def clamp_rgb_channel(value: int | float) -> int:
    return max(0, min(255, int(round(float(value)))))


def clamp_rgb(rgb: tuple[int, int, int] | list[int]) -> tuple[int, int, int]:
    if len(rgb) != 3:
        raise ValueError("RGB must have 3 channels.")
    return (
        clamp_rgb_channel(rgb[0]),
        clamp_rgb_channel(rgb[1]),
        clamp_rgb_channel(rgb[2]),
    )


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    r, g, b = clamp_rgb(rgb)
    return f"#{r:02x}{g:02x}{b:02x}"


def parse_hex_color(value: str) -> tuple[int, int, int]:
    text = value.strip().lstrip("#")
    if len(text) == 3:
        text = "".join(ch * 2 for ch in text)
    if len(text) != 6 or any(ch not in "0123456789abcdefABCDEF" for ch in text):
        raise ValueError("Color must be a hex value like #00dc28.")
    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))


def note_rgb(midi_note: int) -> tuple[int, int, int]:
    """Fallback playing color when no player color is set."""
    del midi_note
    return DEFAULT_LED_RGB


def send_event(
    arduino: serial.Serial,
    event: Event,
    rgb: tuple[int, int, int] | None = None,
) -> None:
    if event.message_type == "ON":
        red, green, blue = clamp_rgb(rgb) if rgb is not None else note_rgb(event.midi_note)
        send_command(arduino, f"ON,{event.led},{red},{green},{blue}", flush=True)
    else:
        send_command(arduino, f"OFF,{event.led}", flush=True)


def send_clear(arduino: serial.Serial) -> None:
    send_command(arduino, "CLEAR", flush=True)


class PianoPlayer:
    def __init__(self, on_message=None):
        self._on_message = on_message
        self._lock = threading.RLock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

        self._arduino: serial.Serial | None = None
        self._port: str | None = None

        self._led_offset = LED_OFFSET
        self._num_leds = NUM_LEDS
        self._fold_to_strip = FOLD_TO_STRIP
        self._preset = "q49"
        self._first_midi = FIRST_MIDI_NOTE
        self._last_midi = LAST_MIDI_NOTE
        self._keyboard = KEYBOARD_NAME

        self._playing = False
        self._paused = False
        self._origin = 0.0
        self._frozen_elapsed = 0.0
        self._file: str | None = None
        self._title: str | None = None
        self._duration = 0.0
        self._event_count = 0
        self._error: str | None = None
        self._active: dict[int, Event] = {}

        self._tempo_rate = 1.0
        self._bpm = DEFAULT_BPM
        self._key: str | None = None
        self._time_signature = "4/4"
        self._beats_per_bar = 4
        self._counting_in = False
        self._count_beat = 0
        self._count_beats = 0
        self._led_rgb = DEFAULT_LED_RGB

    def set_listener(self, on_message) -> None:
        self._on_message = on_message

    def _emit(self, payload: dict) -> None:
        if self._on_message is not None:
            self._on_message(payload)

    def _tempo_rate_locked(self) -> float:
        return self._tempo_rate if self._tempo_rate > 0 else 1.0

    def _elapsed(self) -> float:
        """Song-time seconds (native MIDI timeline), scaled by tempo rate."""
        if self._counting_in:
            return 0.0
        if not self._playing:
            return self._frozen_elapsed
        if self._paused:
            return self._frozen_elapsed
        wall = max(0.0, time.perf_counter() - self._origin)
        return wall * self._tempo_rate_locked()

    def _song_meta_fields(self) -> dict:
        rate = self._tempo_rate_locked()
        bpm = float(self._bpm)
        return {
            "bpm": round(bpm, 2),
            "effective_bpm": round(bpm * rate, 2),
            "tempo_rate": round(rate, 3),
            "key": self._key,
            "time_signature": self._time_signature,
            "beats_per_bar": self._beats_per_bar,
            "min_tempo_rate": MIN_TEMPO_RATE,
            "max_tempo_rate": MAX_TEMPO_RATE,
            "counting_in": self._counting_in,
            "count_beat": self._count_beat,
            "count_beats": self._count_beats,
        }

    def _apply_song_meta(self, meta: dict | None = None) -> None:
        meta = meta or {}
        self._bpm = float(meta.get("bpm") or DEFAULT_BPM)
        self._key = meta.get("key")
        self._time_signature = meta.get("time_signature") or "4/4"
        self._beats_per_bar = max(1, int(meta.get("beats_per_bar") or 4))

    def set_tempo_rate(self, rate: float) -> dict:
        """Change playback speed. 1.0 = original tempo. Can change mid-song."""
        rate = clamp_tempo_rate(rate)
        with self._lock:
            song_pos = self._elapsed()
            self._tempo_rate = rate
            if self._playing and not self._paused:
                self._origin = time.perf_counter() - (song_pos / rate)
            elif self._playing and self._paused:
                self._frozen_elapsed = song_pos
        status = self.status()
        self._emit({"type": "status", **status})
        return status

    def set_led_color(
        self,
        *,
        hex: str | None = None,
        r: int | None = None,
        g: int | None = None,
        b: int | None = None,
        rgb: list[int] | tuple[int, int, int] | None = None,
    ) -> dict:
        """Set the playing LED color. Accepts hex (#rrggbb) or r/g/b / rgb."""
        if hex is not None:
            color = parse_hex_color(hex)
        elif rgb is not None:
            color = clamp_rgb(rgb)
        elif r is not None and g is not None and b is not None:
            color = clamp_rgb((r, g, b))
        else:
            raise ValueError("Provide hex, rgb, or r/g/b.")

        with self._lock:
            self._led_rgb = color
        status = self.status()
        self._emit({"type": "status", **status})
        return status

    def config(self) -> dict:
        with self._lock:
            return {
                "preset": self._preset,
                "led_offset": self._led_offset,
                "num_leds": self._num_leds,
                "fold_to_strip": self._fold_to_strip,
                "first_midi": self._first_midi,
                "last_midi": self._last_midi,
                "keyboard": self._keyboard,
                "keys": self._last_midi - self._first_midi + 1,
                "presets": list(PRESETS.values()),
            }

    def set_config(
        self,
        *,
        preset: str | None = None,
        led_offset: int | None = None,
        num_leds: int | None = None,
        fold_to_strip: bool | None = None,
    ) -> dict:
        with self._lock:
            if preset:
                chosen = PRESETS.get(preset)
                if chosen is None:
                    raise ValueError(f"Unknown preset: {preset}")
                self._preset = chosen["name"]
                self._led_offset = int(chosen["led_offset"])
                self._num_leds = int(chosen["num_leds"])
                self._fold_to_strip = bool(chosen["fold_to_strip"])
            if led_offset is not None:
                self._led_offset = max(0, int(led_offset))
                self._preset = "custom"
            if num_leds is not None:
                self._num_leds = max(1, int(num_leds))
                self._preset = "custom"
            if fold_to_strip is not None:
                self._fold_to_strip = bool(fold_to_strip)
                if self._preset != "custom":
                    # Keep named preset unless values diverge.
                    named = PRESETS.get(self._preset)
                    if named and (
                        named["led_offset"] != self._led_offset
                        or named["num_leds"] != self._num_leds
                        or named["fold_to_strip"] != self._fold_to_strip
                    ):
                        self._preset = "custom"

        self._emit({"type": "status", **self.status()})
        return self.config()

    def status(self) -> dict:
        with self._lock:
            return {
                "playing": self._playing,
                "paused": self._paused,
                "file": self._file,
                "title": self._title,
                "elapsed": round(self._elapsed(), 3),
                "duration": round(self._duration, 3),
                "events": self._event_count,
                "arduino": self._arduino is not None and self._arduino.is_open,
                "port": self._port,
                "error": self._error,
                "active_notes": sorted(self._active.keys()),
                "preset": self._preset,
                "led_offset": self._led_offset,
                "num_leds": self._num_leds,
                "fold_to_strip": self._fold_to_strip,
                "first_midi": self._first_midi,
                "last_midi": self._last_midi,
                "keyboard": self._keyboard,
                "keys": self._last_midi - self._first_midi + 1,
                "led_color": rgb_to_hex(self._led_rgb),
                "led_rgb": list(self._led_rgb),
                **self._song_meta_fields(),
            }

    def connect(self, port: str | None = None) -> str:
        port = port or SERIAL_PORT
        with self._lock:
            if self._arduino is not None:
                self.disconnect()

            arduino = serial.Serial(
                port=port,
                baudrate=BAUD_RATE,
                timeout=1,
                write_timeout=1,
            )

        # Arduino resets when serial opens.
        time.sleep(2.2)
        arduino.reset_input_buffer()
        arduino.reset_output_buffer()
        try:
            send_clear(arduino)
        except Exception:
            pass

        with self._lock:
            self._arduino = arduino
            self._port = port
            self._error = None

        self._emit({"type": "status", **self.status()})
        return port

    def disconnect(self) -> None:
        with self._lock:
            arduino = self._arduino
            self._arduino = None
            self._port = None

        if arduino is not None:
            try:
                self._all_off(arduino)
            except Exception:
                pass
            try:
                send_clear(arduino)
            except Exception:
                pass
            try:
                arduino.close()
            except Exception:
                pass

        self._emit({"type": "status", **self.status()})

    def _map_event(self, event: Event) -> Event | None:
        with self._lock:
            mapped = physical_led(
                event.midi_note,
                event.led,
                num_leds=self._num_leds,
                fold_to_strip=self._fold_to_strip,
            )
        if mapped is None:
            return None
        return Event(
            time=event.time,
            message_type=event.message_type,
            led=mapped,
            midi_note=event.midi_note,
        )

    def _send(self, event: Event) -> None:
        # Ignore late playback writes after Stop has been requested.
        if self._stop.is_set():
            return

        mapped = self._map_event(event)
        if mapped is None:
            return

        with self._lock:
            arduino = self._arduino
            rgb = self._led_rgb

        if arduino is None:
            return

        try:
            send_event(arduino, mapped, rgb=rgb)
        except Exception as exc:
            with self._lock:
                self._error = f"Arduino write failed: {exc}"
                try:
                    arduino.close()
                except Exception:
                    pass
                self._arduino = None
            self._emit({"type": "error", "message": self._error})
            self._emit({"type": "status", **self.status()})

    def _force_led_off(self, led: int, midi_note: int) -> None:
        """Turn a playing key off."""
        if self._stop.is_set():
            return
        off = Event(
            time=self._elapsed(),
            message_type="OFF",
            led=led,
            midi_note=midi_note,
        )
        self._send(off)

    def _clear_hardware(self, arduino: serial.Serial | None) -> None:
        """Force every physical LED off. Prefer CLEAR — avoid serial floods."""
        if arduino is None:
            return

        with self._lock:
            count = max(1, int(self._num_leds))
            # Hold the lock so playback cannot interleave ON while we clear.
            try:
                for _ in range(3):
                    send_clear(arduino)
                    time.sleep(0.015)
                # One OFF each as fallback for older firmware without CLEAR.
                for led in range(count):
                    send_command(arduino, f"OFF,{led}", flush=False)
                send_clear(arduino)
            except Exception:
                return

    def _all_off(self, arduino: serial.Serial | None = None) -> None:
        with self._lock:
            active = list(self._active.values())
            if arduino is None:
                arduino = self._arduino
            self._active.clear()

        for event in active:
            self._emit(
                {
                    "type": "note",
                    "action": "OFF",
                    "led": event.led,
                    "midi": event.midi_note,
                    "time": round(self._elapsed(), 3),
                }
            )

        self._clear_hardware(arduino)

    def play(self, name: str) -> dict:
        path = resolve_archive_file(name)
        mid = mido.MidiFile(path)
        with self._lock:
            offset = self._led_offset
        events = build_timeline(mid, offset)
        if not events:
            raise ValueError("No playable notes found in this MIDI file.")

        duration = float(getattr(mid, "length", 0.0) or 0.0)
        duration = max(duration, events[-1].time)
        title = path.stem
        meta = extract_midi_meta(mid)

        self.stop()

        with self._lock:
            self._stop.clear()
            self._playing = True
            self._paused = False
            self._origin = time.perf_counter()
            self._frozen_elapsed = 0.0
            self._file = path.name
            self._title = title
            self._duration = duration
            self._event_count = len(events)
            self._error = None
            self._active.clear()
            self._counting_in = False
            self._count_beat = 0
            self._count_beats = 0
            self._apply_song_meta(meta)

        self._thread = threading.Thread(
            target=self._run,
            args=(events,),
            kwargs={"count_in": True},
            daemon=True,
            name="midi-playback",
        )
        self._thread.start()
        status = self.status()
        self._emit({"type": "status", **status})
        return status

    def test_walk(self, hold: float = 0.22) -> dict:
        """Light each key on the strip left → right: white, black, white, …"""
        with self._lock:
            offset = self._led_offset
            count = self._num_leds
            notes = keys_on_strip(offset, count)

        if not notes:
            raise ValueError("No piano keys map onto the current LED strip.")

        events: list[Event] = []
        t = 0.15
        for note in notes:
            led = midi_to_led(note, offset)
            if led is None:
                continue
            events.append(Event(time=t, message_type="ON", led=led, midi_note=note))
            events.append(
                Event(time=t + hold, message_type="OFF", led=led, midi_note=note)
            )
            t += hold + 0.04

        first = midi_note_name(notes[0])
        last = midi_note_name(notes[-1])
        title = f"Key walk {first} → {last}"

        self.stop()

        with self._lock:
            previous_fold = self._fold_to_strip
            self._fold_to_strip = False
            self._stop.clear()
            self._playing = True
            self._paused = False
            self._origin = time.perf_counter()
            self._frozen_elapsed = 0.0
            self._file = None
            self._title = title
            self._duration = t
            self._event_count = len(events)
            self._error = None
            self._active.clear()
            self._apply_song_meta(
                {
                    "bpm": 120.0,
                    "key": None,
                    "time_signature": "4/4",
                    "beats_per_bar": 4,
                }
            )

        def _run_and_restore(evts: list[Event], restore_fold: bool) -> None:
            try:
                self._run(evts)
            finally:
                with self._lock:
                    self._fold_to_strip = restore_fold

        self._thread = threading.Thread(
            target=_run_and_restore,
            args=(events, previous_fold),
            daemon=True,
            name="led-walk",
        )
        self._thread.start()
        status = self.status()
        self._emit({"type": "status", **status})
        return status

    def test_chord(self) -> dict:
        """Hold a triad using keys that exist on the current strip."""
        with self._lock:
            offset = self._led_offset
            notes_available = keys_on_strip(offset, self._num_leds)

        if len(notes_available) < 3:
            notes = notes_available
        else:
            # Prefer a major triad from the leftmost keys, e.g. C2–E2–G2 on Q49.
            root = notes_available[0]
            third = next((n for n in notes_available if n == root + 4), None)
            fifth = next((n for n in notes_available if n == root + 7), None)
            if third is not None and fifth is not None:
                notes = [root, third, fifth]
            else:
                notes = notes_available[:3]

        if not notes:
            raise ValueError("No piano keys map onto the current LED strip.")

        label = "+".join(midi_note_name(n) for n in notes)

        # Slight stagger so each note is its own serial command.
        events: list[Event] = []
        for index, note in enumerate(notes):
            led = midi_to_led(note, offset) or 0
            events.append(
                Event(
                    time=0.20 + index * 0.03,
                    message_type="ON",
                    led=led,
                    midi_note=note,
                )
            )
        for index, note in enumerate(notes):
            led = midi_to_led(note, offset) or 0
            events.append(
                Event(
                    time=1.40 + index * 0.03,
                    message_type="OFF",
                    led=led,
                    midi_note=note,
                )
            )

        self.stop()
        with self._lock:
            self._stop.clear()
            self._playing = True
            self._paused = False
            self._origin = time.perf_counter()
            self._frozen_elapsed = 0.0
            self._file = None
            self._title = f"Chord test {label}"
            self._duration = 1.6
            self._event_count = len(events)
            self._error = None
            self._active.clear()
            self._apply_song_meta(
                {
                    "bpm": 120.0,
                    "key": None,
                    "time_signature": "4/4",
                    "beats_per_bar": 4,
                }
            )

        self._thread = threading.Thread(
            target=self._run,
            args=(events,),
            daemon=True,
            name="chord-test",
        )
        self._thread.start()
        status = self.status()
        self._emit({"type": "status", **status})
        return status

    def pause(self) -> None:
        with self._lock:
            if not self._playing or self._paused:
                return
            self._frozen_elapsed = self._elapsed()
            self._paused = True
        self._emit({"type": "status", **self.status()})

    def resume(self) -> None:
        with self._lock:
            if not self._playing or not self._paused:
                return
            rate = self._tempo_rate_locked()
            self._origin = time.perf_counter() - (self._frozen_elapsed / rate)
            self._paused = False
        self._emit({"type": "status", **self.status()})

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=2.0)

        with self._lock:
            arduino = self._arduino
            active = list(self._active.values())
            self._active.clear()
            self._playing = False
            self._paused = False
            self._counting_in = False
            self._count_beat = 0
            self._count_beats = 0
            self._frozen_elapsed = 0.0
            self._thread = None

        for event in active:
            self._emit(
                {
                    "type": "note",
                    "action": "OFF",
                    "led": event.led,
                    "midi": event.midi_note,
                    "time": 0.0,
                }
            )

        self._clear_hardware(arduino)
        self._emit({"type": "done"})
        self._emit({"type": "status", **self.status()})

    def _wait_wall(self, seconds: float) -> bool:
        """Wait wall-clock seconds, respecting pause/stop. False if stopped."""
        remaining = max(0.0, float(seconds))
        while remaining > 0:
            if self._stop.is_set():
                return False
            with self._lock:
                paused = self._paused
            if paused:
                time.sleep(0.04)
                self._emit({"type": "status", **self.status()})
                continue
            slice_s = min(remaining, 0.04)
            time.sleep(slice_s)
            remaining -= slice_s
        return not self._stop.is_set()

    def _count_in(self) -> bool:
        """One-bar audible/visual count before the song. False if stopped."""
        with self._lock:
            beats = max(1, int(self._beats_per_bar))
            self._counting_in = True
            self._count_beat = 0
            self._count_beats = beats

        for beat in range(1, beats + 1):
            if self._stop.is_set():
                return False
            with self._lock:
                self._count_beat = beat
                bpm = max(1.0, float(self._bpm))
                rate = self._tempo_rate_locked()
            wall_beat = (60.0 / bpm) / rate
            self._emit(
                {
                    "type": "count",
                    "beat": beat,
                    "beats": beats,
                    "accent": beat == 1,
                }
            )
            self._emit({"type": "status", **self.status()})
            if not self._wait_wall(wall_beat):
                return False

        with self._lock:
            self._counting_in = False
            self._count_beat = 0
            self._count_beats = 0
            self._origin = time.perf_counter()
            self._frozen_elapsed = 0.0
        self._emit({"type": "status", **self.status()})
        return True

    def _wait_until(self, target: float) -> bool:
        last_status = 0.0

        while not self._stop.is_set():
            with self._lock:
                paused = self._paused

            if paused:
                time.sleep(0.04)
                continue

            remaining = target - self._elapsed()
            now = time.perf_counter()
            if now - last_status >= 0.12:
                self._emit({"type": "status", **self.status()})
                last_status = now

            if remaining <= 0:
                return True

            if remaining > 0.002:
                time.sleep(min(remaining - 0.001, 0.02))

        return False

    def _physical_for(self, event: Event) -> int | None:
        with self._lock:
            return physical_led(
                event.midi_note,
                event.led,
                num_leds=self._num_leds,
                fold_to_strip=self._fold_to_strip,
            )

    def _led_held_by_other(self, midi_note: int, led: int | None) -> bool:
        """True if another active note still owns this physical LED."""
        if led is None:
            return False
        with self._lock:
            for note, active in self._active.items():
                if note == midi_note:
                    continue
                other = physical_led(
                    active.midi_note,
                    active.led,
                    num_leds=self._num_leds,
                    fold_to_strip=self._fold_to_strip,
                )
                if other == led:
                    return True
        return False

    def _run(self, events: list[Event], *, count_in: bool = False) -> None:
        try:
            if count_in and not self._count_in():
                return

            for event in events:
                if not self._wait_until(event.time):
                    return

                if event.message_type == "ON":
                    with self._lock:
                        self._active[event.midi_note] = event
                    self._send(event)
                    self._emit(
                        {
                            "type": "note",
                            "action": "ON",
                            "led": event.led,
                            "midi": event.midi_note,
                            "time": round(event.time, 3),
                        }
                    )
                else:
                    with self._lock:
                        was_active = event.midi_note in self._active
                        self._active.pop(event.midi_note, None)
                    led = self._physical_for(event)
                    if was_active and not self._led_held_by_other(event.midi_note, led):
                        self._force_led_off(event.led, event.midi_note)
                    if was_active:
                        self._emit(
                            {
                                "type": "note",
                                "action": "OFF",
                                "led": event.led,
                                "midi": event.midi_note,
                                "time": round(event.time, 3),
                            }
                        )

            if not self._stop.is_set():
                self._wait_until(self._duration)
                self._all_off()
                with self._lock:
                    self._playing = False
                    self._paused = False
                    self._counting_in = False
                    self._count_beat = 0
                    self._frozen_elapsed = self._duration
                self._emit({"type": "done"})
                self._emit({"type": "status", **self.status()})
        except Exception as exc:
            with self._lock:
                self._playing = False
                self._paused = False
                self._counting_in = False
                self._count_beat = 0
                self._error = str(exc)
                arduino = self._arduino
            try:
                self._clear_hardware(arduino)
            except Exception:
                pass
            self._emit({"type": "error", "message": str(exc)})
            self._emit({"type": "status", **self.status()})


def play_blocking(midi_path: str | Path, port: str = SERIAL_PORT) -> None:
    """CLI playback: connect, play one file, disconnect."""
    path = Path(midi_path)
    if not path.is_file():
        archive_path = ARCHIVE_DIR / path.name
        if archive_path.is_file():
            path = archive_path
        else:
            raise FileNotFoundError(path)

    print("===================================")
    print("       MIDI Piano LED Player")
    print("===================================")
    print("\nConfiguration:")
    print(f"Serial port: {port}")
    print(f"LED offset:  {LED_OFFSET}")
    print(f"Physical LEDs: {NUM_LEDS}")
    print(f"Fold to strip: {FOLD_TO_STRIP}")

    print("\nLoading MIDI...")
    mid = mido.MidiFile(path)
    print(f"File:      {path.name}")
    print(f"Tracks:    {len(mid.tracks)}")
    print(f"PPQ:       {mid.ticks_per_beat}")
    print(f"Length:    {mid.length:.2f} seconds")

    print("\nBuilding event timeline...")
    events = build_timeline(mid, LED_OFFSET)
    print(f"Events:    {len(events)}")
    if not events:
        print("No playable notes found.")
        return

    print("\nFirst 20 events:")
    for event in events[:20]:
        mapped = physical_led(
            event.midi_note,
            event.led,
            num_leds=NUM_LEDS,
            fold_to_strip=FOLD_TO_STRIP,
        )
        print(
            f"{event.time:8.3f}s  "
            f"{event.message_type:3}  "
            f"MIDI {event.midi_note:3}  "
            f"LED {event.led:2}  "
            f"→ phys {mapped}"
        )
    print(f"\nFirst event: {events[0].time:.3f}s")
    print(f"Last event:  {events[-1].time:.3f}s")

    print("\nConnecting to Arduino...")
    try:
        arduino = serial.Serial(
            port=port,
            baudrate=BAUD_RATE,
            timeout=1,
            write_timeout=1,
        )
    except serial.SerialException as exc:
        print("\nERROR: Could not open Arduino serial port.")
        print(exc)
        print("\nCheck that:")
        print("1. Arduino IDE Serial Monitor is CLOSED")
        print("2. Arduino IDE Serial Plotter is CLOSED")
        print("3. Arduino is connected")
        print(f"4. SERIAL_PORT is correct: {port}")
        return

    time.sleep(2.2)
    arduino.reset_input_buffer()
    arduino.reset_output_buffer()
    send_clear(arduino)
    print("Arduino connected.")
    print("\nStarting playback...\n")

    start_time = time.perf_counter()
    try:
        for event in events:
            target_time = start_time + event.time
            while True:
                remaining = target_time - time.perf_counter()
                if remaining <= 0:
                    break
                if remaining > 0.002:
                    time.sleep(remaining - 0.001)
            mapped = physical_led(
                event.midi_note,
                event.led,
                num_leds=NUM_LEDS,
                fold_to_strip=FOLD_TO_STRIP,
            )
            if mapped is None:
                continue
            send_event(
                arduino,
                Event(
                    time=event.time,
                    message_type=event.message_type,
                    led=mapped,
                    midi_note=event.midi_note,
                ),
            )
            print(
                f"{event.time:8.3f}s  "
                f"{event.message_type:3}  "
                f"MIDI {event.midi_note:3}  "
                f"LED {mapped:2}"
            )
        print("\nPlayback finished.")
        send_clear(arduino)
    finally:
        arduino.close()
