const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

const fileList = document.getElementById("file-list");
const search = document.getElementById("search");
const upload = document.getElementById("upload");
const portSelect = document.getElementById("port");
const presetSelect = document.getElementById("preset");
const connectBtn = document.getElementById("connect");
const arduinoState = document.getElementById("arduino-state");
const nowLabel = document.getElementById("now-label");
const nowTitle = document.getElementById("now-title");
const nowMeta = document.getElementById("now-meta");
const countIn = document.getElementById("count-in");
const countNum = document.getElementById("count-num");
const songInfo = document.getElementById("song-info");
const infoKey = document.getElementById("info-key");
const infoTempo = document.getElementById("info-tempo");
const infoMeter = document.getElementById("info-meter");
const infoLength = document.getElementById("info-length");
const playBtn = document.getElementById("play");
const pauseBtn = document.getElementById("pause");
const stopBtn = document.getElementById("stop");
const muteBtn = document.getElementById("mute");
const walkBtn = document.getElementById("walk");
const chordBtn = document.getElementById("chord");
const tempoInput = document.getElementById("tempo");
const tempoMinus = document.getElementById("tempo-minus");
const tempoPlus = document.getElementById("tempo-plus");
const tempoReset = document.getElementById("tempo-reset");
const metronomeBtn = document.getElementById("metronome");
const ledColorInput = document.getElementById("led-color");
const progress = document.getElementById("progress");
const elapsedEl = document.getElementById("elapsed");
const durationEl = document.getElementById("duration");
const modeEl = document.getElementById("mode");
const ledStrip = document.getElementById("led-strip");
const keyboard = document.getElementById("keyboard");

let files = [];
let selected = null;
let status = {
  playing: false,
  paused: false,
  file: null,
  title: null,
  elapsed: 0,
  duration: 0,
  arduino: false,
  preset: "q49",
  led_offset: 24,
  num_leds: 73,
  fold_to_strip: false,
  first_midi: 36,
  last_midi: 84,
  keyboard: "Alesis Q49",
  keys: 49,
  bpm: 120,
  effective_bpm: 120,
  tempo_rate: 1,
  led_color: "#00dc28",
  led_rgb: [0, 220, 40],
  key: null,
  time_signature: "4/4",
  beats_per_bar: 4,
  counting_in: false,
  count_beat: 0,
  count_beats: 0,
};
let muted = false;
let metronomeOn = false;
let lastMetronomeBeat = -1;
let audioCtx = null;
const voices = new Map();
const whiteKeys = [];
const blackKeys = [];
const leds = [];
let tempoSyncing = false;
let localClock = {
  songElapsed: 0,
  wallAt: 0,
  playing: false,
  paused: false,
  rate: 1,
};

function firstNote() {
  return Number(status.first_midi ?? 36);
}

function lastNote() {
  return Number(status.last_midi ?? 84);
}

function isBlack(midi) {
  return BLACK_PCS.has(midi % 12);
}

function formatTime(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const rest = Math.floor(value % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Request failed");
  }
  return data;
}

const mapLegend = document.getElementById("map-legend");

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiNoteName(midi) {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

function modeMessage() {
  const connected = Boolean(status.arduino);
  const offset = Number(status.led_offset || 0);
  const count = Number(status.num_leds || 0);
  const first = firstNote();
  const last = Math.min(lastNote(), first + Math.max(0, count - offset) - 1);
  const keyboardName = status.keyboard || "Alesis Q49";
  const range =
    count > offset
      ? `LED ${offset}=${midiNoteName(first)} … LED ${offset + (last - first)}=${midiNoteName(last)}`
      : "no piano LEDs in range";
  const base = `${keyboardName} · skip 0–${Math.max(0, offset - 1)} · ${range}`;
  return connected
    ? `Hardware link live · ${base}`
    : `Preview mode · ${base}. Connect Arduino to drive the strip.`;
}

function buildInstrument() {
  ledStrip.innerHTML = "";
  keyboard.innerHTML = "";
  whiteKeys.length = 0;
  blackKeys.length = 0;
  leds.length = 0;

  const offset = Number(status.led_offset || 0);
  const physical = Number(status.num_leds || 73);
  const first = firstNote();
  const last = lastNote();

  const whites = [];
  for (let midi = first; midi <= last; midi += 1) {
    if (!isBlack(midi)) whites.push(midi);
  }

  whites.forEach((midi) => {
    const key = document.createElement("div");
    key.className = "white-key";
    key.dataset.midi = String(midi);
    keyboard.appendChild(key);
    whiteKeys[midi] = key;
  });

  const whiteWidth = 100 / Math.max(whites.length, 1);
  const blackWidth = whiteWidth * 0.62;

  for (let midi = first; midi <= last; midi += 1) {
    if (!isBlack(midi)) continue;
    let whitesBefore = 0;
    for (let n = first; n < midi; n += 1) {
      if (!isBlack(n)) whitesBefore += 1;
    }
    const key = document.createElement("div");
    key.className = "black-key";
    key.dataset.midi = String(midi);
    key.style.width = `${blackWidth}%`;
    key.style.left = `${whitesBefore * whiteWidth - blackWidth / 2}%`;
    keyboard.appendChild(key);
    blackKeys[midi] = key;
  }

  const mapped = [];
  for (let midi = first; midi <= last; midi += 1) {
    const ledIndex = midi - first + offset;
    const wired = ledIndex >= 0 && ledIndex < physical;
    const key = keyEl(midi);
    if (key && wired) key.classList.add("mapped");

    let leftPct;
    if (isBlack(midi)) {
      leftPct = parseFloat(blackKeys[midi].style.left) + blackWidth / 2;
    } else {
      let whitesBefore = 0;
      for (let n = first; n < midi; n += 1) {
        if (!isBlack(n)) whitesBefore += 1;
      }
      leftPct = (whitesBefore + 0.5) * whiteWidth;
    }

    const led = document.createElement("span");
    led.className =
      "led" +
      (isBlack(midi) ? " black" : "") +
      (ledIndex < offset ? " offset" : "") +
      (ledIndex >= physical ? " missing" : "") +
      (wired ? " wired" : "");
    led.style.left = `${leftPct}%`;
    led.title = `LED ${ledIndex} → ${midiNoteName(midi)}`;
    ledStrip.appendChild(led);
    leds[ledIndex] = led;
    if (wired) mapped.push(`${ledIndex}:${midiNoteName(midi)}`);
  }

  if (mapLegend) {
    if (mapped.length <= 12) {
      mapLegend.textContent = mapped.join("   ");
    } else {
      mapLegend.textContent = `${mapped[0]} … ${mapped[mapped.length - 1]}  (${mapped.length} keys on ${status.keyboard || "Q49"})`;
    }
  }
}

function keyEl(midi) {
  return whiteKeys[midi] || blackKeys[midi] || null;
}

function physicalIndex(midi) {
  const offset = Number(status.led_offset || 0);
  const count = Number(status.num_leds || 73);
  const first = firstNote();
  if (status.fold_to_strip && count > 0) {
    return (midi - first) % count;
  }
  return midi - first + offset;
}

function setNote(midi, on) {
  const key = keyEl(midi);
  if (key) {
    key.classList.toggle("on", on);
  }
  const ledIndex = physicalIndex(midi);
  const led = leds[ledIndex];
  if (!led) return;
  led.classList.toggle("on", on);
  led.classList.toggle("white-note", on && !isBlack(midi));
  led.classList.toggle("black-note", on && isBlack(midi));
}

function clearNotes() {
  document.querySelectorAll(".white-key.on, .black-key.on, .led.on").forEach((el) => {
    el.classList.remove("on", "white-note", "black-note");
  });
  stopAllVoices();
}

function getAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function startVoice(midi) {
  if (muted) return;
  stopVoice(midi, true);
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = midiToHz(midi);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  voices.set(midi, { osc, gain });
}

function stopVoice(midi, immediate = false) {
  const voice = voices.get(midi);
  if (!voice || !audioCtx) return;
  const ctx = audioCtx;
  try {
    if (immediate) {
      voice.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      voice.osc.stop(ctx.currentTime + 0.01);
    } else {
      voice.gain.gain.cancelScheduledValues(ctx.currentTime);
      voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), ctx.currentTime);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      voice.osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    /* already stopped */
  }
  voices.delete(midi);
}

function stopAllVoices() {
  for (const midi of [...voices.keys()]) {
    stopVoice(midi, true);
  }
}

function formatKey(key) {
  if (!key) return "—";
  return String(key);
}

function formatBpm(value) {
  const bpm = Number(value) || 0;
  if (!bpm) return "—";
  return `${Math.round(bpm * 10) / 10} BPM`;
}

function currentFileMeta() {
  if (status.file) {
    return files.find((item) => item.name === status.file) || null;
  }
  if (selected) {
    return files.find((item) => item.name === selected) || null;
  }
  return null;
}

function songMetaForDisplay() {
  const file = currentFileMeta();
  return {
    key: status.key ?? file?.key ?? null,
    bpm: status.bpm ?? file?.bpm ?? 120,
    time_signature: status.time_signature ?? file?.time_signature ?? "4/4",
    beats_per_bar: status.beats_per_bar ?? file?.beats_per_bar ?? 4,
    duration: status.duration || file?.duration || 0,
    tracks: file?.tracks,
    events: status.events || file?.events || 0,
    name: status.file || file?.name || "",
  };
}

function updateSongInfo() {
  const meta = songMetaForDisplay();
  const hasPiece = Boolean(selected || status.file || status.title);
  songInfo.hidden = !hasPiece;
  if (!hasPiece) return;

  const rate = Number(status.tempo_rate) || 1;
  const baseBpm = Number(meta.bpm) || 120;
  const effective = Number(status.effective_bpm) || baseBpm * rate;

  infoKey.textContent = formatKey(meta.key);
  infoTempo.textContent =
    Math.abs(rate - 1) < 0.001
      ? formatBpm(baseBpm)
      : `${formatBpm(effective)} (${Math.round(rate * 100)}%)`;
  infoMeter.textContent = meta.time_signature || "—";
  infoLength.textContent = formatTime(meta.duration);

  const tracksLabel =
    meta.tracks == null ? null : meta.tracks === 1 ? "1 track" : `${meta.tracks} tracks`;
  const parts = [
    meta.name || null,
    tracksLabel,
    meta.events ? `${meta.events} LED events` : null,
  ].filter(Boolean);
  nowMeta.textContent = parts.join(" · ") || "Song loaded.";
}

function baseBpm() {
  return Number(status.bpm) || Number(currentFileMeta()?.bpm) || 120;
}

function tempoBounds() {
  const base = baseBpm();
  const minRate = Number(status.min_tempo_rate) || 0.5;
  const maxRate = Number(status.max_tempo_rate) || 1.5;
  return {
    base,
    min: Math.max(1, Math.round(base * minRate)),
    max: Math.max(1, Math.round(base * maxRate)),
  };
}

function updateTempoUi() {
  const rate = Number(status.tempo_rate) || 1;
  const { base, min, max } = tempoBounds();
  const effective = Math.round(Number(status.effective_bpm) || base * rate);
  tempoSyncing = true;
  tempoInput.min = String(min);
  tempoInput.max = String(max);
  if (document.activeElement !== tempoInput) {
    tempoInput.value = String(effective);
  }
  tempoSyncing = false;
  const enabled = Boolean(selected || status.playing);
  tempoInput.disabled = !enabled;
  tempoMinus.disabled = !enabled || effective <= min;
  tempoPlus.disabled = !enabled || effective >= max;
  tempoReset.disabled = !enabled;
}

let tempoTimer = null;

function applyTempoBpm(bpm) {
  const { base, min, max } = tempoBounds();
  const clamped = Math.max(min, Math.min(max, Math.round(Number(bpm) || base)));
  const rate = clamped / base;
  tempoInput.value = String(clamped);
  status = { ...status, tempo_rate: rate, effective_bpm: clamped };
  updateSongInfo();
  updateTempoUi();
  clearTimeout(tempoTimer);
  tempoTimer = setTimeout(() => pushTempoBpm(clamped), 80);
}

async function pushTempoBpm(bpm) {
  try {
    applyStatus(
      await api("/api/tempo", {
        method: "POST",
        body: JSON.stringify({ bpm }),
      })
    );
  } catch (error) {
    modeEl.textContent = error.message;
  }
}

async function pushTempoRate(rate) {
  try {
    applyStatus(
      await api("/api/tempo", {
        method: "POST",
        body: JSON.stringify({ rate }),
      })
    );
  } catch (error) {
    modeEl.textContent = error.message;
  }
}

const COLOR_STORAGE_KEY = "piano-led-color";
let colorSyncing = false;
let colorTimer = null;

function normalizeHex(value) {
  let text = String(value || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(text)) {
    text = text
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(text)) {
    return "#00dc28";
  }
  return `#${text.toLowerCase()}`;
}

function applyLedColorUi(hex) {
  const color = normalizeHex(hex || status.led_color || "#00dc28");
  status = { ...status, led_color: color };
  document.documentElement.style.setProperty("--led-play", color);
  colorSyncing = true;
  if (ledColorInput && document.activeElement !== ledColorInput) {
    ledColorInput.value = color;
  }
  colorSyncing = false;
}

async function pushLedColor(hex) {
  const color = normalizeHex(hex);
  applyLedColorUi(color);
  try {
    localStorage.setItem(COLOR_STORAGE_KEY, color);
  } catch (_) {
    /* ignore */
  }
  try {
    applyStatus(
      await api("/api/color", {
        method: "POST",
        body: JSON.stringify({ hex: color }),
      })
    );
  } catch (error) {
    modeEl.textContent = error.message;
  }
}

function clickMetronome(accent) {
  const ctx = getAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1320 : 880;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.18 : 0.1, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
}

function updateLocalClockFromStatus() {
  localClock = {
    songElapsed: Number(status.elapsed) || 0,
    wallAt: performance.now(),
    playing: Boolean(status.playing),
    paused: Boolean(status.paused),
    rate: Number(status.tempo_rate) || 1,
  };
}

function estimatedSongElapsed() {
  if (!localClock.playing || localClock.paused) {
    return localClock.songElapsed;
  }
  const wallDelta = (performance.now() - localClock.wallAt) / 1000;
  return localClock.songElapsed + wallDelta * (localClock.rate || 1);
}

function syncMetronome() {
  if (!metronomeOn || !status.playing || status.paused || status.counting_in) {
    return;
  }
  const bpm = Number(status.bpm) || 120;
  if (bpm <= 0) return;
  const beatPeriod = 60 / bpm;
  const elapsed = estimatedSongElapsed();
  if (elapsed < 0) return;
  const beatIndex = Math.floor(elapsed / beatPeriod);
  if (beatIndex <= lastMetronomeBeat) return;
  // Catch up at most one missed beat to avoid a burst after lag.
  if (beatIndex > lastMetronomeBeat + 1) {
    lastMetronomeBeat = beatIndex - 1;
  }
  lastMetronomeBeat = beatIndex;
  const beatsPerBar = Math.max(1, Number(status.beats_per_bar) || 4);
  clickMetronome(beatIndex % beatsPerBar === 0);
}

function renderFiles() {
  const query = (search.value || "").trim().toLowerCase();
  const visible = files.filter((file) => {
    const haystack = `${file.title} ${file.name} ${file.key || ""}`.toLowerCase();
    return haystack.includes(query);
  });

  fileList.innerHTML = "";
  if (!visible.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = files.length ? "No matching pieces." : "Archive is empty. Add a MIDI file.";
    fileList.appendChild(empty);
    return;
  }

  visible.forEach((file) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = file.name === selected ? "active" : "";
    button.innerHTML = `<span class="file-title"></span><span class="file-meta"></span>`;
    button.querySelector(".file-title").textContent = file.title || file.name;
    const bits = [formatTime(file.duration)];
    if (file.key) bits.push(file.key);
    if (file.bpm) bits.push(`${Math.round(file.bpm)} BPM`);
    button.querySelector(".file-meta").textContent = bits.join(" · ");
    button.addEventListener("click", () => selectFile(file.name));
    item.appendChild(button);
    fileList.appendChild(item);
  });
}

function selectFile(name) {
  const switching = selected !== name;
  const busy =
    status.playing || status.paused || status.counting_in || Number(status.elapsed) > 0;

  const finishSelect = () => {
    selected = name;
    const file = files.find((item) => item.name === name);
    if (!file) return;
    nowLabel.textContent = "Selected";
    nowTitle.textContent = file.title || file.name;
    status = {
      ...status,
      playing: false,
      paused: false,
      counting_in: false,
      count_beat: 0,
      elapsed: 0,
      active_notes: [],
      bpm: file.bpm ?? 120,
      effective_bpm: (file.bpm ?? 120) * (Number(status.tempo_rate) || 1),
      key: file.key ?? null,
      time_signature: file.time_signature ?? "4/4",
      beats_per_bar: file.beats_per_bar ?? 4,
      duration: file.duration || 0,
      events: file.events || 0,
      file: null,
      title: file.title || file.name,
    };
    elapsedEl.textContent = "0:00";
    progress.value = "0";
    updateSongInfo();
    updateTempoUi();
    durationEl.textContent = formatTime(file.duration);
    playBtn.disabled = false;
    renderFiles();
  };

  if (switching || busy) {
    haltPlayback().then(finishSelect);
    return;
  }
  finishSelect();
}

async function haltPlayback() {
  hideCountIn();
  clearNotes();
  stopAllVoices();
  lastMetronomeBeat = -1;
  localClock = {
    songElapsed: 0,
    wallAt: performance.now(),
    playing: false,
    paused: false,
    rate: Number(status.tempo_rate) || 1,
  };

  const needsStop =
    status.playing || status.paused || status.counting_in || Number(status.elapsed) > 0;
  if (!needsStop) {
    applyStatus({
      playing: false,
      paused: false,
      counting_in: false,
      count_beat: 0,
      elapsed: 0,
      active_notes: [],
    });
    return;
  }

  try {
    applyStatus(await api("/api/stop", { method: "POST", body: "{}" }));
  } catch (error) {
    modeEl.textContent = error.message;
    applyStatus({
      playing: false,
      paused: false,
      counting_in: false,
      count_beat: 0,
      elapsed: 0,
      active_notes: [],
    });
  }
  hideCountIn();
  clearNotes();
  stopAllVoices();
}

function showCountIn(beat) {
  if (!countIn || !countNum) return;
  countIn.hidden = false;
  countNum.textContent = String(beat);
  // Retrigger pop animation
  countNum.style.animation = "none";
  void countNum.offsetWidth;
  countNum.style.animation = "";
}

function hideCountIn() {
  if (countIn) countIn.hidden = true;
}

function handleCount(message) {
  getAudio();
  showCountIn(message.beat);
  clickMetronome(Boolean(message.accent));
}

function applyStatus(next) {
  const prevOffset = status.led_offset;
  const prevLeds = status.num_leds;
  const prevFold = status.fold_to_strip;
  const prevFirst = status.first_midi;
  const prevLast = status.last_midi;
  const wasPlaying = status.playing;
  const wasPaused = status.paused;
  status = { ...status, ...next };

  if (status.led_color) {
    applyLedColorUi(status.led_color);
  }

  if (
    status.led_offset !== prevOffset ||
    status.num_leds !== prevLeds ||
    status.fold_to_strip !== prevFold ||
    status.first_midi !== prevFirst ||
    status.last_midi !== prevLast
  ) {
    buildInstrument();
  }

  if (status.preset && presetSelect.value !== status.preset && status.preset !== "custom") {
    presetSelect.value = status.preset;
  }

  const connected = Boolean(status.arduino);
  arduinoState.dataset.on = connected ? "true" : "false";
  arduinoState.textContent = connected ? "Linked" : "Offline";
  connectBtn.textContent = connected ? "Disconnect" : "Connect";
  modeEl.textContent = status.error || modeMessage();

  if (status.file && !selected) {
    selected = status.file;
  }
  if (status.title) {
    nowTitle.textContent = status.title;
  }
  if (status.counting_in) {
    nowLabel.textContent = status.paused ? "Count in paused" : "Count in";
    if (status.count_beat) showCountIn(status.count_beat);
  } else if (status.playing) {
    hideCountIn();
    nowLabel.textContent = status.paused ? "Paused" : "Now playing";
    if (!wasPlaying || (wasPaused && !status.paused)) {
      lastMetronomeBeat =
        Math.floor((Number(status.elapsed) || 0) / (60 / (Number(status.bpm) || 120))) - 1;
    }
  } else if (selected) {
    hideCountIn();
    nowLabel.textContent = "Selected";
    lastMetronomeBeat = -1;
    const file = files.find((item) => item.name === selected);
    if (file && status.file !== selected) {
      status.bpm = file.bpm ?? status.bpm;
      status.key = file.key ?? null;
      status.time_signature = file.time_signature ?? "4/4";
      status.beats_per_bar = file.beats_per_bar ?? 4;
      status.duration = file.duration || status.duration;
      status.events = file.events || status.events;
      status.title = file.title || file.name;
      status.effective_bpm =
        (Number(status.bpm) || 120) * (Number(status.tempo_rate) || 1);
    }
  } else {
    hideCountIn();
  }

  elapsedEl.textContent = formatTime(status.elapsed);
  durationEl.textContent = formatTime(status.duration);
  if (status.duration > 0) {
    progress.value = String(Math.round((status.elapsed / status.duration) * 1000));
  }

  playBtn.disabled = !selected;
  pauseBtn.disabled = !status.playing;
  stopBtn.disabled = !status.playing && status.elapsed === 0;
  pauseBtn.textContent = status.paused ? "Resume" : "Pause";
  updateLocalClockFromStatus();
  updateSongInfo();
  updateTempoUi();
  syncMetronome();

  if (!status.playing && status.elapsed === 0) {
    clearNotes();
  } else if (Array.isArray(status.active_notes)) {
    document.querySelectorAll(".white-key.on, .black-key.on, .led.on").forEach((el) => {
      el.classList.remove("on", "white-note", "black-note");
    });
    status.active_notes.forEach((midi) => setNote(midi, true));
  }
}

function handleNote(message) {
  const on = message.action === "ON";
  setNote(message.midi, on);
  if (on) startVoice(message.midi);
  else stopVoice(message.midi);
}

function connectSocket() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(`${protocol}://${location.host}/ws`);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "status") {
      applyStatus(message);
    } else if (message.type === "count") {
      handleCount(message);
    } else if (message.type === "note") {
      handleNote(message);
    } else if (message.type === "done") {
      hideCountIn();
      stopAllVoices();
      lastMetronomeBeat = -1;
      applyStatus({ playing: false, paused: false, counting_in: false, count_beat: 0 });
      clearNotes();
    } else if (message.type === "error") {
      modeEl.textContent = message.message;
    }
  });
  socket.addEventListener("close", () => {
    setTimeout(connectSocket, 1500);
  });
}

async function loadFiles() {
  const data = await api("/api/files");
  files = data.files || [];
  renderFiles();
  if (!selected && files.length) {
    selectFile(files[0].name);
  }
}

async function loadPorts() {
  const data = await api("/api/ports");
  const ports = data.ports || [];
  portSelect.innerHTML = "";
  if (!ports.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No serial ports found";
    portSelect.appendChild(option);
    return;
  }
  ports.forEach((port) => {
    const option = document.createElement("option");
    option.value = port.device;
    option.textContent = port.description ? `${port.device} — ${port.description}` : port.device;
    portSelect.appendChild(option);
  });
  const usb = ports.find((port) => port.usb);
  if (usb) portSelect.value = usb.device;
}

playBtn.addEventListener("click", async () => {
  if (!selected) return;
  getAudio();
  try {
    if (status.playing && status.paused) {
      applyStatus(await api("/api/resume", { method: "POST", body: "{}" }));
      return;
    }
    if (status.playing) {
      return;
    }
    applyStatus(await api("/api/play", { method: "POST", body: JSON.stringify({ name: selected }) }));
  } catch (error) {
    modeEl.textContent = error.message;
  }
});

pauseBtn.addEventListener("click", async () => {
  try {
    if (status.paused) {
      applyStatus(await api("/api/resume", { method: "POST", body: "{}" }));
    } else {
      applyStatus(await api("/api/pause", { method: "POST", body: "{}" }));
    }
  } catch (error) {
    modeEl.textContent = error.message;
  }
});

stopBtn.addEventListener("click", async () => {
  try {
    await haltPlayback();
  } catch (error) {
    modeEl.textContent = error.message;
  }
});

muteBtn.addEventListener("click", () => {
  muted = !muted;
  muteBtn.textContent = muted ? "Sound off" : "Sound on";
  muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
  if (muted) stopAllVoices();
});

metronomeBtn.addEventListener("click", () => {
  metronomeOn = !metronomeOn;
  metronomeBtn.textContent = metronomeOn ? "Metronome on" : "Metronome off";
  metronomeBtn.setAttribute("aria-pressed", metronomeOn ? "true" : "false");
  if (metronomeOn) {
    getAudio();
    lastMetronomeBeat =
      Math.floor((Number(status.elapsed) || 0) / (60 / (Number(status.bpm) || 120))) - 1;
  } else {
    lastMetronomeBeat = -1;
  }
});

tempoInput.addEventListener("change", () => {
  if (tempoSyncing) return;
  applyTempoBpm(tempoInput.value);
});

tempoInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyTempoBpm(tempoInput.value);
    tempoInput.blur();
  }
});

tempoMinus.addEventListener("click", () => {
  applyTempoBpm((Number(tempoInput.value) || baseBpm()) - 1);
});

tempoPlus.addEventListener("click", () => {
  applyTempoBpm((Number(tempoInput.value) || baseBpm()) + 1);
});

tempoReset.addEventListener("click", () => {
  pushTempoRate(1);
});

ledColorInput.addEventListener("input", () => {
  if (colorSyncing) return;
  const color = normalizeHex(ledColorInput.value);
  applyLedColorUi(color);
  clearTimeout(colorTimer);
  colorTimer = setTimeout(() => pushLedColor(color), 80);
});

ledColorInput.addEventListener("change", () => {
  if (colorSyncing) return;
  pushLedColor(ledColorInput.value);
});

walkBtn.addEventListener("click", async () => {
  try {
    applyStatus(await api("/api/test/walk", { method: "POST", body: "{}" }));
  } catch (error) {
    modeEl.textContent = error.message;
  }
});

chordBtn.addEventListener("click", async () => {
  getAudio();
  try {
    applyStatus(await api("/api/test/chord", { method: "POST", body: "{}" }));
  } catch (error) {
    modeEl.textContent = error.message;
  }
});

presetSelect.addEventListener("change", async () => {
  try {
    const config = await api("/api/config", {
      method: "POST",
      body: JSON.stringify({ preset: presetSelect.value }),
    });
    applyStatus(config);
    modeEl.textContent = modeMessage();
  } catch (error) {
    modeEl.textContent = error.message;
  }
});

connectBtn.addEventListener("click", async () => {
  try {
    if (status.arduino) {
      applyStatus(await api("/api/disconnect", { method: "POST", body: "{}" }));
    } else {
      applyStatus(
        await api("/api/connect", {
          method: "POST",
          body: JSON.stringify({ port: portSelect.value || null }),
        })
      );
    }
  } catch (error) {
    modeEl.textContent = error.message;
  }
});

search.addEventListener("input", renderFiles);

upload.addEventListener("change", async () => {
  const file = upload.files?.[0];
  if (!file) return;
  const body = new FormData();
  body.append("file", file);
  try {
    const created = await fetch("/api/files", { method: "POST", body }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Upload failed");
      return data;
    });
    await loadFiles();
    selectFile(created.name);
  } catch (error) {
    modeEl.textContent = error.message;
  } finally {
    upload.value = "";
  }
});

buildInstrument();
connectSocket();
loadFiles();
loadPorts();
try {
  const saved = localStorage.getItem(COLOR_STORAGE_KEY);
  if (saved) {
    pushLedColor(saved);
  } else {
    applyLedColorUi("#00dc28");
  }
} catch (_) {
  applyLedColorUi("#00dc28");
}
api("/api/config").then((config) => applyStatus(config)).catch(() => {});
api("/api/status").then(applyStatus).catch(() => {});
setInterval(() => {
  api("/api/status").then(applyStatus).catch(() => {});
}, 200);
setInterval(() => {
  syncMetronome();
}, 40);
setInterval(() => {
  loadFiles().catch(() => {});
}, 4000);
