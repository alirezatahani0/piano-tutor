/**
 * Exploded 3D piano + WS2812B — parts merge on scroll.
 * Exposes window.NoorPiano3D
 */
(function () {
  const WHITE = 21;
  const LED_COUNT = 36;
  const BLACK_PATTERN = [0, 1, 3, 4, 5];

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /** Smoothstep for assembly easing */
  function smooth(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function createHeroPiano3D(container) {
    if (!window.THREE || !container) return null;

    const canvas = container.querySelector("[data-piano-canvas]") || container.querySelector("canvas");
    if (!canvas) return null;

    const THREE = window.THREE;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.038);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.HemisphereLight(0xb0b8c0, 0x080808, 0.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(5, 11, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 32;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -6;
    scene.add(keyLight);

    scene.add(new THREE.DirectionalLight(0x7dffc0, 0.35).translateX(-7).translateY(4).translateZ(-3));
    const fill = new THREE.PointLight(0xffffff, 0.4, 40);
    fill.position.set(-4, 4, 6);
    scene.add(fill);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.42, metalness: 0.35 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.35, metalness: 0.45 });
    const ivoryMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.55, metalness: 0.05 });
    const ebonyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4, metalness: 0.2 });
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0d2418,
      roughness: 0.55,
      metalness: 0.3,
      transparent: true,
      opacity: 1,
    });
    const ledOffMat = new THREE.MeshStandardMaterial({
      color: 0x0a120e,
      roughness: 0.6,
      metalness: 0.2,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const ledOnMat = new THREE.MeshStandardMaterial({
      color: 0x2ee59d,
      roughness: 0.35,
      metalness: 0.15,
      emissive: 0x2ee59d,
      emissiveIntensity: 2,
    });

    const root = new THREE.Group();
    scene.add(root);

    const pianoWidth = 10.6;
    const whiteW = pianoWidth / WHITE;
    const whiteH = 0.18;
    const whiteD = 2.35;
    const blackW = whiteW * 0.58;
    const blackH = 0.22;
    const blackD = 1.35;

    // ——— Assembled rest poses ———
    const CASE_REST = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    const KEYS_REST = { x: -pianoWidth / 2 + whiteW / 2, y: 0.34, z: 0.15, rx: 0, ry: 0, rz: 0 };
    const STRIP_REST = { x: 0, y: 0.92, z: -1.12, rx: 0, ry: 0, rz: 0 };
    const LID_REST = { x: 0, y: 0.88, z: -1.55, rx: 0, ry: 0, rz: 0 };

    // ——— Exploded poses (start) ———
    const CASE_EXP = { x: 0, y: -1.4, z: 0.6, rx: 0.08, ry: -0.12, rz: 0 };
    const KEYS_EXP = { x: -pianoWidth / 2 + whiteW / 2, y: 2.6, z: 1.8, rx: -0.35, ry: 0.15, rz: 0.04 };
    const STRIP_EXP = { x: 0, y: 4.2, z: -0.2, rx: -0.9, ry: 0, rz: 0 };
    const LID_EXP = { x: 0, y: 3.1, z: -2.4, rx: -0.55, ry: 0.2, rz: 0 };

    // Case / chassis
    const caseGroup = new THREE.Group();
    root.add(caseGroup);

    const base = new THREE.Mesh(new THREE.BoxGeometry(pianoWidth + 0.35, 0.35, 3.15), bodyMat);
    base.position.set(0, 0, 0.15);
    base.castShadow = true;
    base.receiveShadow = true;
    caseGroup.add(base);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(pianoWidth + 0.2, 0.12, 2.7), accentMat);
    deck.position.set(0, 0.22, 0.05);
    deck.castShadow = true;
    deck.receiveShadow = true;
    caseGroup.add(deck);

    const fallboard = new THREE.Mesh(new THREE.BoxGeometry(pianoWidth + 0.15, 0.55, 0.28), bodyMat);
    fallboard.position.set(0, 0.55, -1.28);
    fallboard.castShadow = true;
    caseGroup.add(fallboard);

    // Lid as separate exploded part
    const lidGroup = new THREE.Group();
    root.add(lidGroup);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(pianoWidth + 0.05, 0.08, 0.9), accentMat);
    lid.castShadow = true;
    lidGroup.add(lid);

    // Ground shadow
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.02;
    root.add(shadow);

    // Keys assembly
    const keyGroup = new THREE.Group();
    root.add(keyGroup);
    const whiteKeys = [];
    const blackKeys = [];

    for (let i = 0; i < WHITE; i += 1) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(whiteW * 0.92, whiteH, whiteD), ivoryMat.clone());
      mesh.position.set(i * whiteW, whiteH / 2, whiteD / 2 - 0.95);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { index: i, restY: mesh.position.y, pressed: 0, expY: (i % 5) * 0.08 };
      keyGroup.add(mesh);
      whiteKeys.push(mesh);
    }

    for (let i = 0; i < WHITE - 1; i += 1) {
      if (!BLACK_PATTERN.includes(i % 7)) continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(blackW, blackH, blackD), ebonyMat);
      mesh.position.set(i * whiteW + whiteW * 0.55, whiteH + blackH / 2 - 0.02, blackD / 2 - 0.95);
      mesh.castShadow = true;
      mesh.userData = { after: i, restY: mesh.position.y, pressed: 0 };
      keyGroup.add(mesh);
      blackKeys.push(mesh);
    }

    // LED strip — also explode individual LEDs slightly at start
    const stripGroup = new THREE.Group();
    root.add(stripGroup);

    const pcb = new THREE.Mesh(new THREE.BoxGeometry(pianoWidth * 0.96, 0.06, 0.22), pcbMat);
    pcb.castShadow = true;
    stripGroup.add(pcb);

    const leds = [];
    const ledSpan = pianoWidth * 0.9;
    const ledStart = -ledSpan / 2;
    const ledStep = ledSpan / (LED_COUNT - 1);

    for (let i = 0; i < LED_COUNT; i += 1) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), ledOffMat.clone());
      const baseX = ledStart + i * ledStep;
      led.position.set(baseX, 0.07, 0);
      led.userData = {
        on: false,
        baseX,
        baseY: 0.07,
        baseZ: 0,
        // staggered explode offset
        expY: 0.25 + (i % 6) * 0.12,
        expZ: ((i % 3) - 1) * 0.15,
      };
      stripGroup.add(led);
      leds.push(led);

      const glow = new THREE.PointLight(0x2ee59d, 0, 1.6, 2);
      glow.position.set(baseX, 0.12, 0);
      stripGroup.add(glow);
      led.userData.light = glow;
    }

    // Floating callout planes (simple label markers)
    function makeCallout(text, color) {
      const canvas2d = document.createElement("canvas");
      canvas2d.width = 512;
      canvas2d.height = 128;
      const ctx = canvas2d.getContext("2d");
      ctx.clearRect(0, 0, 512, 128);
      ctx.font = "600 48px Vazirmatn, sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 64);
      const tex = new THREE.CanvasTexture(canvas2d);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(2.4, 0.6, 1);
      return sprite;
    }

    const labelKeys = makeCallout("کلاویه", "#e8e8e8");
    const labelStrip = makeCallout("WS2812B", "#7dffc0");
    const labelCase = makeCallout("بدنه", "#c8c8c8");
    root.add(labelKeys, labelStrip, labelCase);

    function setPose(group, from, to, t) {
      const k = smooth(t);
      group.position.set(lerp(from.x, to.x, k), lerp(from.y, to.y, k), lerp(from.z, to.z, k));
      group.rotation.set(lerp(from.rx, to.rx, k), lerp(from.ry, to.ry, k), lerp(from.rz, to.rz, k));
    }

    let progress = 0;
    let chase = 0;
    let raf = 0;
    let disposed = false;
    let idlePaused = false;
    let idleStep = 0;
    let lastIdle = 0;
    const idleMotif = [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5];

    function resize() {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 400;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }

    function setLed(i, on) {
      const led = leds[i];
      if (!led) return;
      led.userData.on = on;
      led.material = on ? ledOnMat : ledOffMat;
      if (led.userData.light) led.userData.light.intensity = on ? 1.2 : 0;
    }

    function clearLeds() {
      for (let i = 0; i < leds.length; i += 1) setLed(i, false);
    }

    function pressKey(index, amount = 1) {
      const key = whiteKeys[index];
      if (!key) return;
      key.userData.pressed = Math.max(key.userData.pressed, amount);
      const tone = index % 7;
      if (BLACK_PATTERN.includes(tone)) {
        const black = blackKeys.find((b) => b.userData.after === index);
        if (black) black.userData.pressed = Math.max(black.userData.pressed, amount * 0.9);
      }
    }

    function applyScroll(p) {
      progress = clamp(p, 0, 1);
    }

    /**
     * Scroll timeline:
     * 0.00–0.28  exploded view, camera orbit
     * 0.20–0.55  case + lid merge
     * 0.35–0.70  keys drop into chassis
     * 0.55–0.85  LED strip + chips merge onto fallboard
     * 0.80–1.00  lights power on / chase
     */
    function updateFromScroll(dt) {
      const p = progress;

      const caseT = smooth(clamp((p - 0.12) / 0.38, 0, 1));
      const keysT = smooth(clamp((p - 0.28) / 0.38, 0, 1));
      const stripT = smooth(clamp((p - 0.48) / 0.32, 0, 1));
      const chipT = smooth(clamp((p - 0.58) / 0.28, 0, 1));
      const lightT = smooth(clamp((p - 0.78) / 0.2, 0, 1));
      const labelFade = 1 - smooth(clamp((p - 0.15) / 0.45, 0, 1));

      setPose(caseGroup, CASE_EXP, CASE_REST, caseT);
      setPose(keyGroup, KEYS_EXP, KEYS_REST, keysT);
      setPose(stripGroup, STRIP_EXP, STRIP_REST, stripT);
      setPose(lidGroup, LID_EXP, LID_REST, caseT);

      // Individual key stagger while exploding/merging
      whiteKeys.forEach((key, i) => {
        const stagger = clamp((keysT - i * 0.012) / 0.85, 0, 1);
        const lift = (1 - smooth(stagger)) * key.userData.expY;
        key.position.y = key.userData.restY + lift - key.userData.pressed * 0.08;
        key.rotation.x = (1 - smooth(stagger)) * -0.12 + key.userData.pressed * 0.06;
        key.userData.pressed *= Math.pow(0.06, dt);
      });
      blackKeys.forEach((key) => {
        key.userData.pressed *= Math.pow(0.06, dt);
        key.position.y = key.userData.restY - key.userData.pressed * 0.07;
      });

      // LED chips explode off the PCB then snap in
      leds.forEach((led, i) => {
        const u = led.userData;
        const local = smooth(clamp((chipT - i * 0.008) / 0.7, 0, 1));
        led.position.set(
          u.baseX,
          lerp(u.baseY + u.expY, u.baseY, local),
          lerp(u.baseZ + u.expZ, u.baseZ, local)
        );
        if (u.light) {
          u.light.position.set(led.position.x, led.position.y + 0.05, led.position.z);
        }
      });
      pcb.material.opacity = lerp(0.35, 1, stripT);

      // Labels follow parts, fade as merged
      labelCase.position.set(caseGroup.position.x - 4.2, caseGroup.position.y + 0.4, caseGroup.position.z);
      labelKeys.position.set(keyGroup.position.x + 5.5, keyGroup.position.y + 0.8, keyGroup.position.z + 0.5);
      labelStrip.position.set(stripGroup.position.x, stripGroup.position.y + 0.55, stripGroup.position.z);
      labelCase.material.opacity = labelFade;
      labelKeys.material.opacity = labelFade;
      labelStrip.material.opacity = labelFade;
      labelCase.visible = labelFade > 0.05;
      labelKeys.visible = labelFade > 0.05;
      labelStrip.visible = labelFade > 0.05;

      // Camera: start wide exploded, end seated product shot
      const yaw = lerp(0.95, 0.12, smooth(p));
      const pitchElev = lerp(5.8, 5.2, smooth(p));
      const dist = lerp(14.5, 7.6, smooth(p));
      camera.position.set(Math.sin(yaw) * dist, pitchElev, Math.cos(yaw) * dist);
      camera.lookAt(0, lerp(1.2, 0.7, smooth(p)), lerp(0.3, -0.5, smooth(p)));

      root.rotation.y = lerp(-0.25, 0.04, smooth(p));
      shadow.material.opacity = lerp(0.18, 0.45, caseT);

      // Power-on LEDs after merge
      if (lightT <= 0.01) {
        clearLeds();
      } else {
        chase = (chase + dt * 10) % LED_COUNT;
        const litCount = Math.floor(lightT * LED_COUNT);
        for (let i = 0; i < LED_COUNT; i += 1) {
          setLed(i, i < litCount || (lightT < 0.99 && i === Math.floor(chase)));
        }
        whiteKeys.forEach((key, i) => {
          const mapped = Math.round((i / (WHITE - 1)) * (LED_COUNT - 1));
          const lit = mapped < litCount || mapped === Math.floor(chase);
          key.material.emissive = new THREE.Color(lit ? 0x1fae5b : 0x000000);
          key.material.emissiveIntensity = lit ? 0.25 : 0;
          if (lit && keysT > 0.95 && Math.random() > 0.93) pressKey(i, 0.75);
        });
      }

      // Idle play only when nearly assembled and before full light show
      const now = performance.now();
      if (!idlePaused && keysT > 0.85 && lightT < 0.3 && now - lastIdle > 340) {
        pressKey(idleMotif[idleStep % idleMotif.length], 1);
        idleStep += 1;
        lastIdle = now;
      }
    }

    let last = performance.now();
    function frame(now) {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      updateFromScroll(dt);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    applyScroll(0);
    raf = requestAnimationFrame(frame);

    return {
      setProgress: applyScroll,
      pressKey,
      pauseIdle() {
        idlePaused = true;
      },
      resumeIdle() {
        idlePaused = false;
      },
      resize,
      dispose() {
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        renderer.dispose();
      },
    };
  }

  window.NoorPiano3D = { createHeroPiano3D };
})();
