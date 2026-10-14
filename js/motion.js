/* =========================================================
   Animaciones y transiciones (sobre la estructura existente)
   Reglas: no se mueve el layout, nada tapa texto, solo los
   colores de la paleta. Se apagan con "reducir movimiento".
   ========================================================= */
(function () {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const desktop = matchMedia("(min-width: 821px)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  /* ---------- 1 · Etiquetas que se "decodifican" al aparecer ---------- */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:/#";
  function scramble(el, duration) {
    const final = el.textContent;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      const fixed = Math.floor(p * final.length);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += i < fixed || ch === " " || ch === "—" ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = final;
    })(t0);
  }
  const scrambleEls = $$(".kicker, .program__idx, .today__head > span:first-child, #lcCode").filter((el) => el.children.length === 0 && !el.closest(".hero"));
  const scrambleIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    scrambleIO.unobserve(e.target);
    scramble(e.target, e.target.id === "lcCode" ? 1400 : 900);
  }), { threshold: 0.6 });
  scrambleEls.forEach((el) => scrambleIO.observe(el));

  /* ---------- 2 · Botones magnéticos ---------- */
  if (finePointer) {
    $$(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.22}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = "0 0"; });
    });
  }

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("motion-on");

  /* ---------- 3 · Transiciones entre secciones: pirámide escalonada ----------
     El borde de la sección que entra tiene forma de pirámide de 9 cuerpos y se
     abre hasta quedar recto. Lo que se ve detrás es el color de la sección anterior,
     así que nunca aparece un color nuevo ni se tapa contenido al terminar. */
  const TIERS = 9;
  function pyramidTop(A, offset, h) {
    // perfil superior en px compartidos; offset = dónde empieza este elemento dentro del perfil
    const y = (lvl) => Math.min(h, Math.max(0, A * (1 - lvl / TIERS) - offset));
    const pts = [];
    for (let i = 0; i < TIERS; i++) {
      const x = (i * 50) / TIERS;
      pts.push(`${x}% ${y(i)}px`, `${x}% ${y(i + 1)}px`);
    }
    for (let i = TIERS - 1; i >= 0; i--) {
      const x = 100 - (i * 50) / TIERS;
      pts.push(`${x}% ${y(i + 1)}px`, `${x}% ${y(i)}px`);
    }
    pts.push(`100% ${h}px`, `0% ${h}px`);
    return `polygon(${pts.join(",")})`;
  }
  const amp = () => Math.min(innerHeight * 0.55, desktop ? 460 : 260);
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  // Oscuro → claro: la cinta y el inicio de Áreas comparten el mismo perfil
  const ribbon = $(".ribbon"), areas = $("#areas");
  // alturas cacheadas: leerlas en cada frame (después de escribir clip-path) forzaba un reflow
  let rh = 0, ah = 0, ampV = 0, lastRise = { r: "", a: "" };
  const measureRise = () => { rh = ribbon.offsetHeight; ah = areas.offsetHeight; ampV = amp(); };
  measureRise();
  function drawRise(p) {
    const A = ampV * (1 - ease(p));
    const r = pyramidTop(A, 0, rh), a = A > rh ? pyramidTop(A, rh, ah) : "none";
    if (r !== lastRise.r) ribbon.style.clipPath = lastRise.r = r;
    if (a !== lastRise.a) areas.style.clipPath = lastRise.a = a;
  }
  ScrollTrigger.create({
    trigger: ribbon, start: "top bottom", end: "top -30%", scrub: 1,
    onUpdate: (st) => drawRise(st.progress), onRefresh: (st) => { measureRise(); drawRise(st.progress); },
  });

  /* ---------- 4 · La greca y el friso avanzan con el scroll ---------- */
  gsap.to("#greca", { attr: { x: 480 }, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
  gsap.to("#frieze", { attr: { x: -600 }, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });

  /* ---------- 5 · Fotos de la galería: parallax dentro de su marco ---------- */
  $$(".ph img").forEach((img) => {
    gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, {
      yPercent: 6, scale: 1.14, ease: "none",
      scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  /* ---------- 7 · Numeral maya de Base 20: crece y gira al entrar ---------- */
  gsap.fromTo(".cero__glyph", { scale: 0.7, rotationY: 160, transformPerspective: 900 }, {
    scale: 1, rotationY: 0, ease: "none",
    scrollTrigger: { trigger: ".cero", start: "top 85%", end: "top 15%", scrub: 0.6 },
  });

  /* ---------- 8 · Listas de programas en cascada ---------- */
  $$(".program__list").forEach((ol) => {
    const items = $$("li", ol);
    gsap.set(items, { opacity: 0, x: -24 });
    ScrollTrigger.create({
      trigger: ol, start: "top 88%", once: true,
      onEnter: () => gsap.to(items, { opacity: 1, x: 0, stagger: 0.08, duration: 0.7, ease: "power3.out" }),
    });
  });

  /* ---------- 9 · Cinta de temas: se inclina según la velocidad del scroll ---------- */
  const marquee = $(".marquee");
  if (marquee) {
    let last = scrollY, skew = 0, shown = 0;
    gsap.ticker.add(() => {
      const v = scrollY - last;
      last = scrollY;
      skew += (Math.max(-10, Math.min(10, -v * 0.35)) - skew) * 0.15;
      if (Math.abs(skew - shown) > 0.05) { shown = skew; gsap.set(marquee, { skewX: skew }); }
    });
  }

  /* ---------- 11 · Animaciones de entrada por sección ----------
     Animan el contenido de la sección que entra, ligadas al scroll, y terminan
     exactamente en el layout original (no hay capas encima ni secciones fijas). */
  const scrubIn = (trigger, start, end) => ({ trigger, start: start || "top bottom", end: end || "top 25%", scrub: 1 });

  // Comunidad: las fotos llegan como pantallas curvas (Jesper Landberg) y se aplanan
  $$(".gallery__col").forEach((col, ci) => {
    $$(".ph", col).forEach((ph, i) => {
      gsap.fromTo(ph,
        { rotateY: ci ? -38 : 38, z: -220 - i * 60, opacity: 0.25, transformPerspective: 1200, transformOrigin: ci ? "0% 50%" : "100% 50%" },
        { rotateY: 0, z: 0, opacity: 1, ease: "none", scrollTrigger: scrubIn(ph, "top bottom", "top 40%") });
    });
  });

  // Áreas: las tarjetas entran juntas (escalonadas) al llegar, se quedan quietas y salen al irse.
  // Van por tiempo, no atadas al scroll, para que se vean fluidas aunque bajes rápido.
  const cards = $$(".card");
  cards.forEach((c) => { c.removeAttribute("data-reveal"); c.classList.add("in"); c.classList.remove("tilt"); });
  if (cards.length) {
    const HIDDEN = { y: 120, rotationX: -30, scale: 0.9, opacity: 0 };
    gsap.set(cards, { ...HIDDEN, transformPerspective: 1200, transformOrigin: "50% 100%" });
    const show = () => gsap.to(cards, { y: 0, rotationX: 0, scale: 1, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.06, overwrite: true });
    const leave = () => gsap.to(cards, { y: -80, rotationX: 20, scale: 0.94, opacity: 0, duration: 0.6, ease: "power2.in", stagger: { each: 0.04, from: "end" }, overwrite: true });
    const reset = () => gsap.to(cards, { ...HIDDEN, duration: 0.5, ease: "power2.in", overwrite: true });
    ScrollTrigger.create({ trigger: ".cards", start: "top 85%", end: "bottom 20%", onEnter: show, onEnterBack: show, onLeave: leave, onLeaveBack: reset });
    // inclinación al pasar el cursor (con GSAP para no chocar con la entrada)
    if (finePointer) cards.forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        gsap.to(c, { rotationY: ((e.clientX - r.left) / r.width - 0.5) * 8, rotationX: -((e.clientY - r.top) / r.height - 0.5) * 8, duration: 0.5, overwrite: "auto" });
      });
      c.addEventListener("pointerleave", () => gsap.to(c, { rotationY: 0, rotationX: 0, duration: 0.6, overwrite: "auto" }));
    });
  }

  // Programas: las ventanas vuelan desde el fondo en 3D y el texto entra de lado
  $$(".program").forEach((pr, i) => {
    const m = $(".mock", pr), txt = $(".program__text", pr);
    if (m) {
      m.classList.remove("tilt");
      gsap.fromTo(m, { z: -600, rotationY: i % 2 ? 28 : -28, y: 120, scale: 0.9, transformPerspective: 1600 },
        { z: 0, rotationY: 0, y: 0, scale: 1, ease: "none", scrollTrigger: scrubIn(pr, "top bottom", "top 20%") });
    }
    if (txt) gsap.fromTo(txt, { x: -90, opacity: 0.15 }, { x: 0, opacity: 1, ease: "none", scrollTrigger: scrubIn(pr, "top bottom", "top 35%") });
  });

  // Base 20: el número cuenta hasta 2026 y se dibuja un anillo de marcas
  const glyph = $(".cero__glyph");
  if (glyph) {
    const NS = "http://www.w3.org/2000/svg";
    const ring = document.createElementNS(NS, "svg");
    ring.setAttribute("viewBox", "-100 -100 200 200");
    ring.setAttribute("class", "cero__ring");
    ring.setAttribute("aria-hidden", "true");
    const ticks = [];
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2 - Math.PI / 2, r1 = 92, r2 = k % 6 === 0 ? 84 : 88;
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", Math.cos(a) * r1); l.setAttribute("y1", Math.sin(a) * r1);
      l.setAttribute("x2", Math.cos(a) * r2); l.setAttribute("y2", Math.sin(a) * r2);
      ring.appendChild(l); ticks.push(l);
    }
    glyph.appendChild(ring);
    let last = -1, lit = 0;
    ScrollTrigger.create({
      ...scrubIn(".cero", "top 85%", "top 10%"),
      onUpdate: (st) => {
        const p = st.progress, on = Math.round(p * ticks.length);
        if (on !== lit) {
          for (let k = Math.min(on, lit); k < Math.max(on, lit); k++) ticks[k].classList.toggle("on", k < on);
          lit = on;
        }
        if (!window.maiasUserNumber && window.maiasSetNumber) {
          const n = Math.round(2026 * (1 - Math.pow(1 - p, 2)));
          if (n !== last) { last = n; window.maiasSetNumber(n); }
        }
      },
    });
  }

  // Únete: el formulario entra de lado
  const form = $("#joinForm");
  if (form) gsap.fromTo(form, { x: 140, opacity: 0.2 }, { x: 0, opacity: 1, ease: "none", scrollTrigger: scrubIn("#unete", "top 85%", "top 20%") });

  /* ---------- 12 · Cambio de sección: disolución tipo video (Cominvi) ----------
     La sección anterior se disuelve como humo sobre la que entra, con un frente de
     niebla de color, sin elementos encima del contenido. */
  (function smoke() {
    // campo de ruido suave y repetible (256×256) para el humo
    const N = 256, field = new Float32Array(N * N);
    const R = (() => { let a = 7; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    const octave = (cell, amp) => {
      const g = Math.ceil(N / cell), grid = Array.from({ length: g * g }, R);
      const at = (x, y) => grid[((y % g) + g) % g * g + (((x % g) + g) % g)];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const gx = x / cell, gy = y / cell, x0 = Math.floor(gx), y0 = Math.floor(gy);
        const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const bot = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        field[y * N + x] += (top + (bot - top) * sy) * amp;
      }
    };
    octave(64, 0.5); octave(32, 0.25); octave(16, 0.15); octave(8, 0.1);

    const CW = 128, CH = 72;
    // término radial fijo por píxel (antes se calculaba con Math.hypot en cada frame)
    const radial = new Float32Array(CW * CH);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const dx = x / CW - 0.5, dy = y / CH - 0.5;
      radial[y * CW + x] = (1 - Math.min(1, Math.sqrt(dx * dx + dy * dy * 0.64) * 1.4)) * 0.38;
    }

    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const STEPS = [
      { sel: "#comunidad", from: "#0d1d20", mist: "#6cc3c0", ink: "#eee7d9", a: "0", b: "1", name: "La comunidad" },
      { sel: "#cero", from: "#eee7d9", mist: "#c4462a", ink: "#17191a", a: "3", b: "4", name: "Sistema vigesimal" },
    ];
    const live = [];
    STEPS.forEach((cfg) => {
      const sec = $(cfg.sel);
      if (!sec) return;
      const wrap = document.createElement("div");
      wrap.className = "tr-smoke";
      wrap.setAttribute("aria-hidden", "true");
      wrap.style.setProperty("--ink", cfg.ink);
      wrap.innerHTML = `<canvas width="${CW}" height="${CH}"></canvas>`;
      sec.prepend(wrap);
      const cv = $("canvas", wrap), ctx = cv.getContext("2d"), img = ctx.createImageData(CW, CH);
      const base = hex(cfg.from), mist = hex(cfg.mist);
      const st = { wrap, ctx, img, base, mist, p: 0, on: false };
      live.push(st);
      ScrollTrigger.create({
        trigger: sec, start: "top bottom", end: "top top", scrub: 1.6, // el humo alcanza al scroll con calma
        onUpdate: (t) => { st.p = t.progress; },
        onToggle: (t) => { st.on = t.isActive; st.p = t.progress; paint(st, 0); }, // al salir deja el estado final limpio
        onRefresh: (t) => { st.p = t.progress; paint(st, 0); },
      });
    });

    function paint(st, time) {
      const p = st.p * 1.4 - 0.2, w = 0.17, d = st.img.data; // frente más ancho = disolución más pausada
      const vis = p >= 1 + w ? "hidden" : "visible";
      if (st.vis !== vis) st.wrap.style.visibility = st.vis = vis;
      if (vis === "hidden") return;
      const ox = time * 3, oy = -time * 5;
      for (let y = 0; y < CH; y++) {
        const row = (((y * 1.3 + oy) | 0) & 255) * N;
        for (let x = 0; x < CW; x++) {
          const fx = ((x * 1.3 + ox) | 0) & 255;
          const n = field[row + fx] * 0.62 + radial[y * CW + x];
          let a = Math.min(1, Math.max(0, (n - p + w) / (2 * w)));
          a = a * a * (3 - 2 * a);
          const m = Math.max(0, 1 - Math.abs(n - p) / (w * 1.4)) * (p > 0 ? 1 : 0);
          const i = (y * CW + x) * 4;
          d[i] = st.base[0] + (st.mist[0] - st.base[0]) * m * 0.75;
          d[i + 1] = st.base[1] + (st.mist[1] - st.base[1]) * m * 0.75;
          d[i + 2] = st.base[2] + (st.mist[2] - st.base[2]) * m * 0.75;
          d[i + 3] = Math.min(255, (a + m * 0.55) * 255);
        }
      }
      st.ctx.putImageData(st.img, 0, 0);
    }
    gsap.ticker.add((time) => {
      live.forEach((st) => { if (st.on) paint(st, time); });
    });
  })();
  /* ---------- 13 · Base 20 → Únete: anochecer + Ko'ox ----------
     Base 20 se oscurece mientras el borde crema de Únete se apaga al mismo ritmo (nunca hay línea) y el título Ko'ox
     entra enorme y se asienta a su tamaño mientras sube. */
  (function nightfall() {
    const cero = $("#cero"), join = $("#unete"), title = join && $(".join__title", join);
    if (!cero || !join) return;
    const dusk = document.createElement("div");
    dusk.className = "cero__dusk";
    dusk.setAttribute("aria-hidden", "true");
    cero.appendChild(dusk);
    const dawn = document.createElement("div");
    dawn.className = "join__dawn";
    dawn.setAttribute("aria-hidden", "true");
    join.prepend(dawn);
    // mismo progreso para los dos: el color en ambos lados del borde siempre coincide
    gsap.timeline({ scrollTrigger: { trigger: join, start: "top bottom", end: "top 30%", scrub: 1 } })
      .fromTo(dusk, { opacity: 0 }, { opacity: 1, ease: "none" }, 0)
      .fromTo(dawn, { opacity: 1 }, { opacity: 0, ease: "none" }, 0);
    if (title) gsap.fromTo(title, { scale: 1.8, opacity: 0.3 }, { scale: 1, opacity: 1, ease: "none",
      scrollTrigger: { trigger: join, start: "top 90%", end: "top 15%", scrub: 1 } });
  })();
  /* ---------- 14 · Áreas → Programas: arco maya escalonado que se abre ----------
     El contenido de Programas solo se ve dentro del arco: aparece conforme el arco crece,
     con el contorno en almagre marcando el borde. El fondo crema no se recorta. */
  (function archReveal() {
    const sec = $("#programas"), inner = sec && $(".wrap", sec);
    if (!sec || !inner) return;
    const cv = document.createElement("canvas");
    cv.className = "tr-arch";
    cv.setAttribute("aria-hidden", "true");
    sec.prepend(cv);
    const ctx = cv.getContext("2d");
    const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
    fit(); addEventListener("resize", fit);
    const ease = (t) => t * t * (3 - 2 * t);
    // silueta del arco en coordenadas de la sección (igual a las del canvas, que va en su borde superior)
    function arch(W, H, k) {
      const aw = W * 1.5 * k, ah = H * 1.6 * k, cx = W / 2, by = H + 10;
      const wall = ah * 0.45, steps = 6, topW = aw * 0.12, stepH = (ah - wall) / steps, stepW = (aw / 2 - topW / 2) / steps;
      const pts = [[cx - aw / 2, by], [cx - aw / 2, by - wall]];
      for (let i = 0; i < steps; i++) { const x = cx - aw / 2 + stepW * (i + 1), y = by - wall - stepH * (i + 1); pts.push([x - stepW, y], [x, y]); }
      pts.push([cx + topW / 2, by - ah]);
      for (let i = steps - 1; i >= 0; i--) { const x = cx + aw / 2 - stepW * (i + 1), y = by - wall - stepH * (i + 1); pts.push([x, y], [x + stepW, y]); }
      pts.push([cx + aw / 2, by - wall], [cx + aw / 2, by]);
      return { pts, by };
    }
    function clip(pts, by, W) {
      // de la base del arco hacia abajo todo queda visible
      const ox = innerOff.x, oy = innerOff.y, f = (x, y) => `${(x - ox).toFixed(1)}px ${(y - oy).toFixed(1)}px`;
      const big = 1e5;
      const poly = [f(-big, by), ...pts.map(([x, y]) => f(x, y)), f(W + big, by), f(W + big, by + big), f(-big, by + big)];
      inner.style.clipPath = `polygon(${poly.join(",")})`;
    }
    // offsets de .wrap cacheados (se actualizan en refresh/resize, no en cada frame)
    const innerOff = { x: 0, y: 0 };
    const measureInner = () => { innerOff.x = inner.offsetLeft; innerOff.y = inner.offsetTop; };
    measureInner();
    let idle = false;
    function draw(p) {
      const W = cv.width, H = cv.height;
      if (p <= 0 || p >= 1) {
        if (idle) return; // ya está limpio: no repetir trabajo
        idle = true;
        ctx.clearRect(0, 0, W, H);
        cv.style.visibility = "hidden"; inner.style.clipPath = "none"; return;
      }
      idle = false;
      ctx.clearRect(0, 0, W, H);
      cv.style.visibility = "visible";
      const k = ease(Math.min(1, p / 0.8)), fade = 1 - Math.max(0, (p - 0.7) / 0.3);
      const { pts, by } = arch(W, H, k);
      clip(pts, by, W);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.globalAlpha = fade;
      ctx.lineJoin = "miter";
      ctx.strokeStyle = "#c4462a"; ctx.lineWidth = 6; ctx.stroke();
      ctx.strokeStyle = "rgba(23,25,26,.5)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ScrollTrigger.create({ trigger: sec, start: "top bottom", end: "top -60%", scrub: 1,
      onUpdate: (t) => draw(t.progress), onRefresh: (t) => { measureInner(); idle = false; draw(t.progress); }, onToggle: (t) => draw(t.progress) });
  })();
  ScrollTrigger.sort();

  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts) document.fonts.ready.then(refresh);
  addEventListener("load", refresh);
})();
