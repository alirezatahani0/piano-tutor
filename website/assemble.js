/**
 * Apple-style exploded product assembly for نورپیانو
 * Pure DOM/CSS — no CDN dependency
 */
(function () {
  const WHITE = 28;
  const BLACK_PATTERN = [0, 1, 3, 4, 5];
  const LED_COUNT = 36;

  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }

  function smooth(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function buildKeys(host) {
    if (!host) return;
    host.innerHTML = "";
    const whites = document.createElement("div");
    whites.className = "ap-white-keys";
    const blacks = document.createElement("div");
    blacks.className = "ap-black-keys";

    for (let i = 0; i < WHITE; i += 1) {
      const key = document.createElement("span");
      key.className = "ap-white";
      key.dataset.i = String(i);
      whites.appendChild(key);
    }
    for (let i = 0; i < WHITE - 1; i += 1) {
      if (!BLACK_PATTERN.includes(i % 7)) continue;
      const key = document.createElement("span");
      key.className = "ap-black";
      key.style.left = `${((i + 1) / WHITE) * 100}%`;
      blacks.appendChild(key);
    }
    host.appendChild(whites);
    host.appendChild(blacks);
  }

  function buildLeds(host) {
    if (!host) return;
    host.innerHTML = "";
    for (let i = 0; i < LED_COUNT; i += 1) {
      const led = document.createElement("span");
      led.className = "ap-led-chip";
      host.appendChild(led);
    }
  }

  function buildAction(host) {
    if (!host) return;
    host.innerHTML = "";
    for (let i = 0; i < WHITE; i += 1) {
      const lever = document.createElement("span");
      lever.className = "ap-lever";
      host.appendChild(lever);
    }
  }

  function buildScrews(host, count) {
    if (!host) return;
    host.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const s = document.createElement("span");
      s.className = "ap-screw";
      s.style.setProperty("--sx", `${8 + i * (84 / Math.max(count - 1, 1))}%`);
      host.appendChild(s);
    }
  }

  function createAssembly(root) {
    if (!root) return null;

    const product = root.querySelector("[data-assemble-product]");
    const parts = [...root.querySelectorAll("[data-part]")];
    const leds = root.querySelector("[data-ap-leds]");
    const keys = root.querySelector("[data-ap-keys]");
    const action = root.querySelector("[data-ap-action]");
    const screws = [...root.querySelectorAll("[data-ap-screws]")];
    const chips = root.querySelector("[data-ap-chips]");

    buildKeys(keys);
    buildLeds(leds);
    buildAction(action);
    screws.forEach((el) => buildScrews(el, 7));

    // tiny chips on PCB
    if (chips) {
      chips.innerHTML = "";
      for (let i = 0; i < 18; i += 1) {
        const c = document.createElement("span");
        c.className = "ap-chip";
        c.style.setProperty("--cx", `${6 + (i % 9) * 10}%`);
        c.style.setProperty("--cy", `${20 + Math.floor(i / 9) * 40}%`);
        chips.appendChild(c);
      }
    }

    let progress = 0;

    function setProgress(p) {
      progress = clamp(p, 0, 1);
      const assemble = smooth(progress);
      // spread: 1 exploded → 0 assembled
      const spread = 1 - assemble;
      root.style.setProperty("--assemble", assemble.toFixed(4));
      root.style.setProperty("--spread", spread.toFixed(4));

      parts.forEach((part, i) => {
        const n = parts.length;
        const mid = (n - 1) / 2;
        // vertical explode offset in px (via CSS var)
        const offset = (i - mid) * spread * -72;
        part.style.setProperty("--y", `${offset}px`);
        part.style.setProperty("--opacity-label", String(clamp(spread * 1.4, 0, 1)));
      });

      // LED power-on near end
      const lit = assemble > 0.78;
      root.classList.toggle("is-lit", lit);
      root.classList.toggle("is-assembled", assemble > 0.92);

      if (leds) {
        const ledEls = [...leds.querySelectorAll(".ap-led-chip")];
        const count = Math.floor(clamp((assemble - 0.75) / 0.22, 0, 1) * ledEls.length);
        ledEls.forEach((el, i) => el.classList.toggle("on", i < count || (lit && i % 5 === Math.floor(progress * 20) % 5)));
      }

      // press a few keys when assembled
      if (keys && lit) {
        const whites = [...keys.querySelectorAll(".ap-white")];
        whites.forEach((k) => k.classList.remove("pressed"));
        const idx = Math.floor((performance.now() / 280) % WHITE);
        whites[idx]?.classList.add("pressed");
        whites[(idx + 4) % WHITE]?.classList.add("pressed");
      }
    }

    setProgress(0);

    return { setProgress, product };
  }

  window.NoorAssemble = { createAssembly };
})();
