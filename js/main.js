(function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 820px)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Numerales mayas decorativos ---------- */
  $$("[data-maya]").forEach((el) => { el.innerHTML = Maya.svg(+el.dataset.maya); });

  /* ---------- Split de títulos en palabras ---------- */
  $$("[data-split]").forEach((el) => {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span"); w.className = "w";
            const s = document.createElement("span"); s.textContent = part; s.style.setProperty("--i", i++);
            w.appendChild(s); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
  });

  /* ---------- Reveals ---------- */
  const revealIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  const startReveals = () => $$("[data-split], [data-reveal]").forEach((el) => {
    if (el.closest(".hero")) return;
    revealIO.observe(el);
  });

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.stop();
    // ScrollTrigger se actualiza en el mismo frame que el scroll suave (sin desfase ni tirones en los scrubs)
    if (window.ScrollTrigger) lenis.on("scroll", () => ScrollTrigger.update());
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id === "#inicio" ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }));

  /* ---------- Cursor ---------- */
  const mouse = { x: 0, y: 0, px: innerWidth / 2, py: innerHeight / 2 };
  addEventListener("pointermove", (e) => {
    mouse.px = e.clientX; mouse.py = e.clientY;
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  const cursor = $("#cursor");
  let cx = mouse.px, cy = mouse.py;
  if (finePointer && !reduced) {
    document.documentElement.classList.add("has-cursor");
    const ring = $(".cursor__ring", cursor), dot = $(".cursor__dot", cursor), label = $(".cursor__label", cursor);
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("a, button, [data-cursor], input, select, .tilt");
      cursor.classList.toggle("is-hover", !!t && !t.dataset.cursor);
      cursor.classList.toggle("is-label", !!(t && t.dataset.cursor));
      label.textContent = t && t.dataset.cursor ? t.dataset.cursor : "";
    });
    cursor._tick = () => {
      if (Math.abs(mouse.px - cx) < 0.05 && Math.abs(mouse.py - cy) < 0.05) return; // quieto: no reescribir estilos
      cx += (mouse.px - cx) * 0.2; cy += (mouse.py - cy) * 0.2;
      ring.style.translate = `${cx}px ${cy}px`;
      label.style.translate = `${cx}px ${cy}px`;
      dot.style.translate = `${mouse.px}px ${mouse.py}px`;
    };
  }

  /* ---------- Tilt (hover 3D) ---------- */
  if (finePointer && !reduced) {
    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        const k = el.classList.contains("mock") ? 4 : 7;
        el.style.setProperty("--ry", `${x * k}deg`);
        el.style.setProperty("--rx", `${-y * k}deg`);
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
    });
  }

  /* ---------- Escena 3D ---------- */
  const scene = window.MaiasScene ? MaiasScene.create($("#gl"), { mobile }) : null;
  if (!scene) document.documentElement.classList.add("no-webgl");
  addEventListener("resize", () => scene && scene.resize());

  const scrolly = $("#scrolly"), heroInner = $("#heroInner");
  const galleryCols = $$(".gallery__col[data-speed]");
  const SCENES = [
    { name: "K'UK'ULKAN · 365 ESCALONES", coord: "20.6843° N · 88.5678° O" },
    { name: "TZOLK'IN · 13 × 20 = 260", coord: "RUEDA CALENDÁRICA · 52 AÑOS" },
    { name: "VENUS · 584 DÍAS", coord: "CÓDICE DE DRESDE" },
    { name: "RED NEURONAL · 5 CAPAS", coord: "MÉRIDA · 2026" },
    { name: "CEREBRO · 86 MIL MILLONES DE NEURONAS", coord: "CORTEZA · CEREBELO · TALLO" },
    { name: "CENOTE · AGUA DULCE BAJO LA CALIZA", coord: "PENÍNSULA DE YUCATÁN" },
  ];
  const hudIdx = $("#hudIdx"), hudName = $("#hudName"), hudCoord = $("#hudCoord"), ticks = $$("#hudTicks i");
  let morph = 0, intro = reduced ? 1 : 0, lastScene = -1, clock = 0, loaded = false;
  const HOLD = 6.5, TR = 1.8; // segundos por escena / duración de la transición

  /* ---------- Hoy en el calendario maya (correlación GMT 584283) ---------- */
  (function longCount() {
    const TZ = ["Imix", "Ik'", "Ak'bal", "K'an", "Chikchan", "Kimi", "Manik'", "Lamat", "Muluk", "Ok", "Chuwen", "Eb", "Ben", "Ix", "Men", "Kib", "Kaban", "Etz'nab", "Kawak", "Ajaw"];
    const HAAB = ["Pop", "Wo'", "Sip", "Sotz'", "Sek", "Xul", "Yaxk'in", "Mol", "Ch'en", "Yax", "Sak'", "Keh", "Mak", "K'ank'in", "Muwan", "Pax", "K'ayab", "Kumk'u", "Wayeb'"];
    const now = new Date();
    const jdn = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000 + 2440588;
    const days = jdn - 584283;
    const parts = [Math.floor(days / 144000), Math.floor((days % 144000) / 7200), Math.floor((days % 7200) / 360), Math.floor((days % 360) / 20), days % 20];
    const names = ["bak'tun", "k'atun", "tun", "winal", "k'in"];
    $("#lcGlyphs").innerHTML = parts.map((v, i) => `<figure>${Maya.svg(v)}<figcaption>${names[i]}</figcaption></figure>`).join("");
    $("#lcCode").textContent = parts.join(".");
    $("#lcTz").textContent = `${((days + 3) % 13) + 1} ${TZ[(days + 19) % 20]}`;
    const h = (days + 348) % 365;
    $("#lcHaab").textContent = `${h % 20} ${HAAB[Math.floor(h / 20)]}`;
    $("#lcDays").textContent = days.toLocaleString("es-MX");
  })();

  /* ---------- Nav claro/oscuro ---------- */
  const nav = $("#nav");
  const navSections = $$("[data-nav]");
  let lastY = 0, heroP = -1, navOnLight = null;
  galleryCols.forEach((c) => { c._speed = +c.dataset.speed; });

  function onFrame(dt) {
    const vh = innerHeight, y = scrollY;

    // ciclo automático de escenas: pirámide → ruedas → Venus → red → cerebro → cenote → (se dispersa) → pirámide
    const NS = SCENES.length;
    let target = 0, introTarget = 1, tickP = SCENES.map((_, i) => (i === 0 ? 1 : 0));
    if (!reduced && loaded) {
      clock += dt;
      const t = clock % (HOLD * NS), idx = Math.floor(t / HOLD), local = t - idx * HOLD;
      const tr = clamp((local - (HOLD - TR)) / TR, 0, 1);
      if (idx < NS - 1) target = idx + tr;
      else { target = NS - 1; introTarget = 1 - tr; }
      tickP = SCENES.map((_, i) => (i < idx ? 1 : i === idx ? local / HOLD : 0));
    }
    if (target === 0 && morph > NS - 1.5 && intro < 0.15) morph = 0; // reinicio mientras está disperso
    else morph += (target - morph) * Math.min(1, dt * 4);
    if (loaded || reduced) intro += clamp(introTarget - intro, -dt * 0.75, dt * 0.55);

    // ---- lecturas de layout primero (todas juntas, para no forzar varios reflows por frame) ----
    const galleryTops = mobile ? null : galleryCols.map((c) => c.parentElement.getBoundingClientRect());
    const visible = scrolly.getBoundingClientRect().bottom > 0;
    let navLight = null;
    for (const s of navSections) {
      const r = s.getBoundingClientRect();
      if (r.top <= 36 && r.bottom > 36) { navLight = s.dataset.nav === "light"; break; }
    }

    // ---- escrituras ----
    // HUD
    const sIdx = clamp(Math.round(morph), 0, SCENES.length - 1);
    if (sIdx !== lastScene) {
      lastScene = sIdx;
      hudIdx.textContent = "0" + (sIdx + 1);
      hudName.textContent = SCENES[sIdx].name;
      hudCoord.textContent = SCENES[sIdx].coord;
    }
    ticks.forEach((el, i) => {
      const p = Math.round(tickP[i] * 1000) / 1000;
      if (el._p !== p) { el._p = p; el.style.setProperty("--p", p); }
    });

    // parallax de la galería (solo cuando está cerca de la pantalla)
    if (galleryTops) galleryCols.forEach((c, i) => {
      const r = galleryTops[i];
      if (r.bottom < -vh || r.top > vh * 2) return;
      const v = Math.round((r.top + r.height / 2 - vh / 2) * c._speed * 10) / 10;
      if (c._ty !== v) { c._ty = v; c.style.transform = `translateY(${v}px)`; }
    });

    // hero se desvanece (solo escribe si cambió)
    const hp = Math.round(clamp(y / (vh * 0.75), 0, 1) * 1000) / 1000;
    if (hp !== heroP) {
      heroP = hp;
      heroInner.style.opacity = 1 - hp;
      heroInner.style.transform = `translateY(${hp * -60}px)`;
    }

    // render solo cuando la escena está a la vista
    if (scene && visible) {
      // al bajar, la figura se deshace en partículas que salen disparadas
      const exit = reduced ? 0 : clamp(y / (vh * 0.95), 0, 1);
      scene.uniforms.uIntro.value = (1 - Math.pow(1 - clamp(intro, 0, 1), 3)) * (1 - exit * exit * 0.9);
      scene.render(reduced ? 0 : dt, morph, mouse);
    }

    // nav: color según sección bajo la barra, y se oculta al bajar
    if (navLight !== null && navLight !== navOnLight) { navOnLight = navLight; nav.classList.toggle("on-light", navLight); }
    if (Math.abs(y - lastY) > 4) {
      nav.classList.toggle("is-hidden", y > lastY && y > vh * 1.2);
      lastY = y;
    }

    if (cursor._tick) cursor._tick();
  }

  let prev = performance.now();
  function raf(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (lenis) lenis.raf(now);
    onFrame(dt);
    requestAnimationFrame(raf);
  }

  /* ---------- Loader (cuenta en base 20) ---------- */
  function start() {
    document.body.classList.remove("is-loading");
    loaded = true;
    $("#loader").classList.add("is-done");
    if (lenis) lenis.start();
    setTimeout(() => $$(".hero [data-split], .hero [data-reveal]").forEach((el) => el.classList.add("in")), reduced ? 0 : 250);
    startReveals();
  }
  if (reduced) { $("#loader").style.display = "none"; start(); }
  else {
    document.body.classList.add("is-loading");
    const num = $("#loaderNum"), pct = $("#loaderPct");
    const T = 1500, t0 = performance.now();
    let shown = -1;
    (function tick() {
      const p = Math.min(1, (performance.now() - t0) / T);
      const n = Math.min(19, Math.floor(p * 20));
      if (n !== shown) { shown = n; num.innerHTML = Maya.svg(n); }
      pct.textContent = String(Math.round(p * 100)).padStart(2, "0");
      if (p < 1) requestAnimationFrame(tick); else setTimeout(start, 180);
    })();
  }
  requestAnimationFrame(raf);

  /* ---------- Mini-visualizaciones ---------- */
  MaiasViz.init(reduced);

  /* ---------- Mock: notebook entrenando ---------- */
  const nbOut = $("#nbOut");
  let nbTimer = null;
  function runNotebook() {
    nbOut.innerHTML = "";
    let ep = 0, loss = 0.84;
    const step = () => {
      if (ep >= 5) {
        const done = document.createElement("div");
        done.className = "nb__row nb__done";
        done.innerHTML = "<span>✓ listo</span><span>R² validación = 0.87</span><span></span>";
        nbOut.appendChild(done);
        nbTimer = setTimeout(runNotebook, 3200);
        return;
      }
      ep++; loss *= 0.62 + Math.random() * 0.08;
      const row = document.createElement("div");
      row.className = "nb__row";
      row.innerHTML = `<span>lote ${ep}/5</span><span class="nb__bar"><i style="width:${ep * 20}%"></i></span><span>error ${loss.toFixed(3)}</span>`;
      nbOut.appendChild(row);
      nbTimer = setTimeout(step, 650);
    };
    step();
  }
  new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting && !nbTimer) runNotebook();
    else if (!e.isIntersecting && nbTimer) { clearTimeout(nbTimer); nbTimer = null; }
  }), { threshold: 0.3 }).observe($(".mock--nb"));

  /* ---------- Mock: es ⇄ maya yucateco ---------- */
  const PAIRS = [
    ["¿Cómo estás?", "Bix a beel?", ["¿", "Cómo", "est", "ás", "?"]],
    ["Bien", "Ma'alob", ["Bien"]],
    ["Gracias", "Dios bo'otik", ["Gra", "cias"]],
    ["Vamos", "Ko'ox", ["Vam", "os"]],
  ];
  const es = $("#nlpEs"), yua = $("#nlpYua"), tok = $("#nlpTok");
  let nlpTimer = null, pi = 0;
  function nlpCycle() {
    const [src, dst, toks] = PAIRS[pi++ % PAIRS.length];
    es.textContent = src; yua.textContent = ""; tok.innerHTML = "";
    toks.forEach((t, i) => setTimeout(() => { const b = document.createElement("b"); b.textContent = t; tok.appendChild(b); }, 120 * i));
    let k = 0;
    const type = () => {
      if (k <= dst.length) { yua.textContent = dst.slice(0, k++); nlpTimer = setTimeout(type, 70); }
      else nlpTimer = setTimeout(nlpCycle, 2200);
    };
    nlpTimer = setTimeout(type, 120 * toks.length + 300);
  }
  if (reduced) { es.textContent = PAIRS[0][0]; yua.textContent = PAIRS[0][1]; }
  else new IntersectionObserver((e) => e.forEach((x) => {
    if (x.isIntersecting && !nlpTimer) nlpCycle();
    else if (!x.isIntersecting && nlpTimer) { clearTimeout(nlpTimer); nlpTimer = null; }
  }), { threshold: 0.3 }).observe($("#nlp"));

  /* ---------- Conversor a numeración maya ---------- */
  const input = $("#mayaInput"), out = $("#mayaOut"), brk = $("#mayaBreak");
  const SUP = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷"];
  function renderMaya(quiet) {
    let n = Math.floor(+input.value);
    if (!isFinite(n) || n < 0) n = 0;
    n = Math.min(n, 63999999);
    out.innerHTML = Maya.svg(n, { animate: !reduced && quiet !== true });
    const d = Maya.toBase20(n);
    brk.innerHTML = d.map((v, i) => {
      const p = d.length - 1 - i;
      return `<li><span><b>${v}</b> × 20${SUP[p]}</span><span>${(v * Math.pow(20, p)).toLocaleString("es-MX")}</span></li>`;
    }).join("") + `<li class="total"><span>total</span><span>${n.toLocaleString("es-MX")}</span></li>`;
  }
  input.addEventListener("input", () => { window.maiasUserNumber = true; renderMaya(); });
  $$(".cero__chips button").forEach((b) => b.addEventListener("click", () => { window.maiasUserNumber = true; input.value = b.dataset.n; renderMaya(); }));
  renderMaya();
  window.maiasSetNumber = (n) => { input.value = n; renderMaya(true); };

  /* ---------- Formulario ---------- */
  // TODO: conectar a un backend real (Formspree, Google Forms, Supabase, etc.)
  $("#joinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget, msg = $("#formMsg");
    const nombre = f.nombre.value.trim(), correo = f.correo.value.trim();
    f.nombre.classList.toggle("is-invalid", !nombre);
    f.correo.classList.toggle("is-invalid", !/^\S+@\S+\.\S+$/.test(correo));
    if (!nombre || !/^\S+@\S+\.\S+$/.test(correo)) { msg.textContent = "Revisa tu nombre y correo."; return; }
    msg.textContent = `¡Listo, ${nombre.split(" ")[0]}! Te escribiremos pronto. Ko'ox.`;
    f.reset();
  });
})();
