const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const form = document.getElementById("order-form");
const formStatus = document.getElementById("form-status");

const WHITE = 21;
const LED_COUNT = 36;
const BLACK_PATTERN = [0, 1, 3, 4, 5];

const TITLES = ["هنر نور روی کلاویه", "مهندسی روی ساز می‌نشیند", "هر نت، یک پیکسل نور"];

const LEADS = [
  "جایی که نوازندگی به مهندسی نور می‌رسد.",
  "نوار WS2812B دقیقاً بالای کلاویه‌ها.",
  "هنر می‌نوازد؛ مدار همگام می‌شود.",
];

/** @type {{id:string,title:string,artist:string,duration:string,notes:number[]}[]} */
const SHOWCASE_SONGS = [
  {
    id: "time",
    title: "Time",
    artist: "Hans Zimmer",
    duration: "۰:۱۸",
    notes: [0, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 11, 12, 11, 7, 4, 2, 0],
  },
  {
    id: "interstellar",
    title: "Cornfield Chase",
    artist: "Hans Zimmer",
    duration: "۰:۱۶",
    notes: [4, 7, 9, 11, 9, 7, 4, 2, 4, 7, 9, 12, 11, 9, 7, 4, 7, 9, 11, 14, 12, 11, 9, 7],
  },
  {
    id: "river",
    title: "River Flows in You",
    artist: "Yiruma",
    duration: "۰:۲۰",
    notes: [7, 9, 11, 12, 11, 9, 7, 4, 7, 9, 11, 9, 7, 4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 11, 12],
  },
  {
    id: "nuvole",
    title: "Nuvole Bianche",
    artist: "Ludovico Einaudi",
    duration: "۰:۱۷",
    notes: [0, 4, 7, 11, 12, 11, 7, 4, 2, 5, 9, 12, 14, 12, 9, 5, 0, 4, 7, 12, 11, 7, 4, 0],
  },
  {
    id: "clocks",
    title: "Clocks",
    artist: "Coldplay",
    duration: "۰:۱۵",
    notes: [9, 7, 4, 0, 9, 7, 4, 0, 11, 9, 5, 2, 11, 9, 5, 2, 12, 9, 7, 4, 12, 9, 7, 4],
  },
  {
    id: "elise",
    title: "Für Elise",
    artist: "Beethoven",
    duration: "۰:۱۴",
    notes: [12, 11, 12, 11, 12, 7, 10, 9, 5, 0, 4, 5, 0, 4, 5, 12, 11, 12, 11, 12, 7, 10, 9, 5],
  },
  {
    id: "allofme",
    title: "All of Me",
    artist: "John Legend",
    duration: "۰:۱۶",
    notes: [4, 7, 9, 11, 9, 7, 11, 12, 11, 9, 7, 4, 2, 4, 7, 9, 7, 4, 0, 2, 4, 7, 9, 7],
  },
  {
    id: "experience",
    title: "Experience",
    artist: "Ludovico Einaudi",
    duration: "۰:۱۵",
    notes: [2, 4, 7, 9, 11, 9, 7, 4, 2, 4, 7, 11, 12, 14, 12, 11, 9, 7, 4, 2, 0, 2, 4, 7],
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function progressWithin(el) {
  const rect = el.getBoundingClientRect();
  const view = window.innerHeight || 1;
  const total = rect.height + view;
  const passed = view - rect.top;
  return clamp(passed / total, 0, 1);
}

function stickyProgress(section) {
  const rect = section.getBoundingClientRect();
  const stickyTravel = section.offsetHeight - window.innerHeight;
  if (stickyTravel <= 0) return 0;
  return clamp(-rect.top / stickyTravel, 0, 1);
}

function buildPianoKeys(whiteHost, blackHost, ledHost) {
  if (!whiteHost || !blackHost) return;

  whiteHost.innerHTML = "";
  blackHost.innerHTML = "";
  if (ledHost) ledHost.innerHTML = "";

  for (let i = 0; i < WHITE; i += 1) {
    const key = document.createElement("button");
    key.type = "button";
    key.className = "white-key";
    key.dataset.index = String(i);
    key.setAttribute("tabindex", "-1");
    key.setAttribute("aria-hidden", "true");
    whiteHost.appendChild(key);
  }

  for (let i = 0; i < WHITE - 1; i += 1) {
    const tone = i % 7;
    if (!BLACK_PATTERN.includes(tone)) continue;
    const black = document.createElement("div");
    black.className = "black-key";
    black.dataset.after = String(i);
    const pct = ((i + 1) / WHITE) * 100;
    black.style.left = `calc(${pct}% - 2.1%)`;
    blackHost.appendChild(black);
  }

  if (ledHost) {
    for (let i = 0; i < LED_COUNT; i += 1) {
      const led = document.createElement("span");
      led.className = "ws2812-led";
      led.dataset.index = String(i);
      ledHost.appendChild(led);
    }
  }
}

function buildDemoPiano() {
  buildPianoKeys(
    document.querySelector("[data-demo-white]"),
    document.querySelector("[data-demo-black]"),
    document.querySelector("[data-demo-leds]")
  );
}

function pressKeyIn(root, index, duration = 160) {
  if (!root) return;
  const white = root.querySelector(`.white-key[data-index="${index}"]`);
  if (!white) return;
  white.classList.add("pressed", "lit");
  window.setTimeout(() => {
    white.classList.remove("pressed");
    window.setTimeout(() => white.classList.remove("lit"), 80);
  }, duration);

  const tone = index % 7;
  if (BLACK_PATTERN.includes(tone) && index < WHITE - 1) {
    const black = root.querySelector(`.black-key[data-after="${index}"]`);
    if (black) {
      black.classList.add("pressed");
      window.setTimeout(() => black.classList.remove("pressed"), duration);
    }
  }
}

function lightLedIn(root, whiteIndex, on = true) {
  if (!root) return;
  const leds = [...root.querySelectorAll(".ws2812-led")];
  if (!leds.length) return;
  const ledIndex = Math.round((whiteIndex / Math.max(WHITE - 1, 1)) * (leds.length - 1));
  leds.forEach((led, i) => {
    if (i === ledIndex) led.classList.toggle("on", on);
  });
}

function clearDemoLights(root) {
  if (!root) return;
  root.querySelectorAll(".ws2812-led.on").forEach((led) => led.classList.remove("on"));
  root.querySelectorAll(".white-key.lit, .white-key.pressed").forEach((key) => {
    key.classList.remove("lit", "pressed");
  });
  root.querySelectorAll(".black-key.pressed").forEach((key) => key.classList.remove("pressed"));
}

function buildHeroPiano() {
  buildPianoKeys(
    document.querySelector("[data-white-keys]"),
    document.querySelector("[data-black-keys]"),
    document.querySelector("[data-leds]")
  );
}

function pressKey(index, duration = 160) {
  const hero = document.querySelector("[data-piano]");
  pressKeyIn(hero, index, duration);
}

function setLedState(countOn, chaseIndex = -1) {
  const hero = document.querySelector("[data-piano]");
  if (!hero) return;
  const leds = [...hero.querySelectorAll(".ws2812-led")];
  const whites = [...hero.querySelectorAll(".white-key")];
  leds.forEach((led, i) => {
    const on = i < countOn || i === chaseIndex;
    led.classList.toggle("on", on);
  });
  whites.forEach((key, i) => {
    const mapped = Math.floor((i / Math.max(WHITE - 1, 1)) * (LED_COUNT - 1));
    key.classList.toggle("lit", mapped < countOn || mapped === chaseIndex);
  });
}

function setupIdlePlay() {
  if (prefersReduced) return null;
  const motif = [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5];
  let step = 0;
  let paused = false;
  const id = window.setInterval(() => {
    if (paused) return;
    pressKey(motif[step % motif.length]);
    step += 1;
  }, 320);
  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    stop() {
      window.clearInterval(id);
    },
  };
}

/** Soft piano-like tone via Web Audio */
function createTonePlayer() {
  /** @type {AudioContext | null} */
  let ctx = null;

  const ensure = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  return {
    play(whiteIndex, durationMs = 280) {
      const audio = ensure();
      if (!audio) return;
      // Map white key index → approximate frequency (C3 base)
      const whiteSemis = [0, 2, 4, 5, 7, 9, 11];
      const octave = Math.floor(whiteIndex / 7);
      const tone = whiteIndex % 7;
      const midi = 48 + octave * 12 + whiteSemis[tone];
      const freq = 440 * 2 ** ((midi - 69) / 12);

      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const filter = audio.createBiquadFilter();
      osc.type = "triangle";
      osc.frequency.value = freq;
      filter.type = "lowpass";
      filter.frequency.value = 2400;
      gain.gain.value = 0.0001;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audio.destination);

      const now = audio.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
      osc.start(now);
      osc.stop(now + durationMs / 1000 + 0.05);
    },
  };
}

function setupShowcase() {
  const list = document.querySelector("[data-song-list]");
  const piano = document.querySelector("[data-demo-piano]");
  const nowEl = document.querySelector("[data-demo-now]");
  const stopBtn = document.querySelector("[data-demo-stop]");
  const replayBtn = document.querySelector("[data-demo-replay]");
  if (!list || !piano) return;

  const tones = createTonePlayer();
  let activeId = SHOWCASE_SONGS[0].id;
  let timer = 0;
  let playing = false;
  let step = 0;
  /** @type {number[]} */
  let queue = [];

  const renderList = () => {
    list.innerHTML = "";
    SHOWCASE_SONGS.forEach((song, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `song-item${song.id === activeId ? " is-active" : ""}`;
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", song.id === activeId ? "true" : "false");
      btn.innerHTML = `
        <span class="song-item-index">${i + 1}</span>
        <span class="song-item-meta">
          <span class="song-item-title">${song.title}</span>
          <span class="song-item-artist">${song.artist}</span>
        </span>
        <span class="song-item-dur">${song.duration}</span>
      `;
      btn.addEventListener("click", () => selectSong(song.id, true));
      li.appendChild(btn);
      list.appendChild(li);
    });
  };

  const stop = () => {
    playing = false;
    step = 0;
    window.clearTimeout(timer);
    clearDemoLights(piano);
    if (nowEl) {
      const song = SHOWCASE_SONGS.find((s) => s.id === activeId);
      nowEl.textContent = song ? `آماده · ${song.title}` : "آماده";
    }
  };

  const tick = () => {
    if (!playing) return;
    if (step >= queue.length) {
      stop();
      if (nowEl) nowEl.textContent = "پایان قطعه";
      return;
    }
    const note = queue[step] % WHITE;
    clearDemoLights(piano);
    pressKeyIn(piano, note, 220);
    lightLedIn(piano, note, true);
    tones.play(note, 260);
    step += 1;
    timer = window.setTimeout(tick, prefersReduced ? 420 : 320);
  };

  const play = () => {
    const song = SHOWCASE_SONGS.find((s) => s.id === activeId);
    if (!song) return;
    window.clearTimeout(timer);
    clearDemoLights(piano);
    queue = song.notes;
    step = 0;
    playing = true;
    if (nowEl) nowEl.textContent = `در حال پخش · ${song.title}`;
    tick();
  };

  const selectSong = (id, autoPlay) => {
    activeId = id;
    renderList();
    if (autoPlay) play();
    else stop();
  };

  stopBtn?.addEventListener("click", stop);
  replayBtn?.addEventListener("click", play);

  renderList();
  stop();

  // Auto-start when section enters view once
  const section = document.querySelector("[data-showcase]");
  if (section && !prefersReduced) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          play();
          obs.disconnect();
        });
      },
      { threshold: 0.35 }
    );
    obs.observe(section);
  }
}

function setupNav() {
  if (!navToggle || !header) return;
  navToggle.addEventListener("click", () => {
    const open = header.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  header.querySelectorAll(".nav a, .header-cta").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupForm() {
  if (!form || !formStatus) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const plan = document.querySelector('input[name="plan"]:checked')?.value || "pro";
    const name = String(data.get("name") || "").trim();
    const labels = { starter: "آغاز", pro: "آتلیه", studio: "کارگاه" };
    formStatus.hidden = false;
    formStatus.textContent = `${name} عزیز، درخواست پلن «${labels[plan] || plan}» ثبت شد. به‌زودی تماس می‌گیریم.`;
    form.reset();
    const pro = document.querySelector('input[name="plan"][value="pro"]');
    if (pro) pro.checked = true;
  });
}

function setupEnterObservers() {
  const nodes = document.querySelectorAll("[data-enter], [data-enter-from]");
  if (prefersReduced) {
    nodes.forEach((node) => node.classList.add("is-inview"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-inview");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );
  nodes.forEach((node) => observer.observe(node));
}

function setupScrollExperience(idlePlay) {
  const stage = document.querySelector("[data-hero-stage]");
  const heroCopy = document.querySelector("[data-hero-copy]");
  const piano = document.querySelector("[data-piano]");
  const strip = document.querySelector("[data-led-strip]");
  const glow = document.querySelector("[data-piano-glow]");
  const title = document.querySelector("[data-hero-title]");
  const lead = document.querySelector("[data-hero-lead]");
  const hint = document.querySelector("[data-scroll-hint]");
  const story = document.querySelector("[data-story]");
  const beats = [...document.querySelectorAll("[data-beat]")];
  const panels = [...document.querySelectorAll("[data-panel]")];
  const marqueeText = document.querySelector("[data-marquee-text]");
  const parallaxShots = [...document.querySelectorAll("[data-parallax]")];

  let lastY = window.scrollY;
  let ticking = false;
  let lastPhase = -1;
  let heroProgress = 0;
  let chase = 0;
  let lastPress = 0;

  const applyHeroLayout = (p) => {
    const mount = clamp((p - 0.18) / 0.32, 0, 1);
    const light = clamp((p - 0.48) / 0.42, 0, 1);
    const phase = p < 0.22 ? 0 : p < 0.55 ? 1 : 2;

    if (heroCopy) {
      const fade = clamp(p / 0.85, 0, 1);
      heroCopy.style.opacity = String(1 - fade * 0.25);
      heroCopy.style.transform = `translate3d(0, ${fade * -12}px, 0)`;
    }

    if (phase !== lastPhase) {
      if (title) title.textContent = TITLES[phase];
      if (lead) lead.textContent = LEADS[phase];
      lastPhase = phase;
    }

    if (piano) {
      const tiltX = lerp(12, 6, p);
      const tiltY = lerp(-4, 0, p);
      const scale = lerp(1, 1.06, Math.min(p * 1.2, 1));
      piano.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${scale})`;
    }

    if (strip) {
      const y = lerp(-48, 6, mount);
      strip.style.opacity = String(mount);
      strip.style.transform = `translate3d(0, ${y}px, 0) scaleX(${lerp(0.88, 1, mount)})`;
    }

    if (glow) {
      glow.classList.toggle("lit", light > 0.12);
      glow.style.opacity = String(lerp(0.4, 1, light));
    }

    if (idlePlay) {
      if (p > 0.42) idlePlay.pause();
      else idlePlay.resume();
    }

    if (hint) hint.style.opacity = String(1 - clamp(p * 2.2, 0, 1));
  };

  const tickLeds = (now) => {
    const light = clamp((heroProgress - 0.48) / 0.42, 0, 1);
    if (light <= 0.01) {
      setLedState(0);
      return;
    }
    chase = (chase + 0.45) % LED_COUNT;
    const litCount = Math.floor(light * LED_COUNT);
    setLedState(litCount, light < 0.99 ? Math.floor(chase) : -1);
    if (light > 0.35 && now - lastPress > 280) {
      pressKey(Math.floor(Math.random() * WHITE), 110);
      lastPress = now;
    }
  };

  const update = () => {
    ticking = false;
    const y = window.scrollY;

    if (header) {
      header.classList.toggle("scrolled", y > 12);
      if (!prefersReduced && Math.abs(y - lastY) > 4) {
        header.classList.toggle("hidden", y > lastY && y > 220);
      }
    }
    lastY = y;

    if (stage) {
      heroProgress = prefersReduced ? 1 : stickyProgress(stage);
      applyHeroLayout(heroProgress);
    }

    if (story && beats.length && !prefersReduced) {
      const isDesktopSticky = window.matchMedia("(min-width: 961px)").matches;
      if (isDesktopSticky) {
        const p = stickyProgress(story);
        const index = Math.min(beats.length - 1, Math.floor(p * beats.length));
        beats.forEach((beat, i) => beat.classList.toggle("is-active", i === index));
        panels.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
      }
    } else if (story && beats.length && prefersReduced) {
      beats.forEach((beat) => beat.classList.add("is-active"));
      if (panels[0]) panels[0].classList.add("is-active");
    }

    if (marqueeText && !prefersReduced) {
      const section = marqueeText.closest("[data-marquee]");
      if (section) {
        const p = progressWithin(section);
        const dir = document.documentElement.dir === "rtl" ? 1 : -1;
        marqueeText.style.transform = `translate3d(${dir * (p - 0.5) * 40}vw, 0, 0)`;
      }
    }

    if (!prefersReduced) {
      parallaxShots.forEach((shot) => {
        const rect = shot.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const offset = (mid - window.innerHeight / 2) / window.innerHeight;
        const media = shot.querySelector(".shot-fill, img");
        if (media) {
          media.style.transform = `translate3d(0, ${offset * -28}px, 0) scale(1.06)`;
        }
      });
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  const loop = (now) => {
    if (!prefersReduced) tickLeds(now || performance.now());
    requestAnimationFrame(loop);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
  requestAnimationFrame(loop);
}

buildHeroPiano();
buildDemoPiano();
const idlePlay = setupIdlePlay();
setupShowcase();
setupNav();
setupForm();
setupEnterObservers();
setupScrollExperience(idlePlay);

if (!prefersReduced && window.matchMedia("(max-width: 960px)").matches) {
  const beats = [...document.querySelectorAll("[data-beat]")];
  const panels = [...document.querySelectorAll("[data-panel]")];
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = Number(entry.target.getAttribute("data-beat") || 0);
        panels.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
      });
    },
    { threshold: 0.6 }
  );
  beats.forEach((beat) => obs.observe(beat));
}
