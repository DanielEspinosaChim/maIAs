/* Mini-visualizaciones animadas en canvas para las tarjetas de áreas y el visor. */
(function () {
  const INK = "#17191a", MUTED = "rgba(23,25,26,.28)", RED = "#c4462a", BLUE = "#1f6f72", AMB = "#d99a2b";
  const MONO = '500 10px "JetBrains Mono", monospace';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  /* 1 · dispersión + regresión */
  function scatter() {
    const R = mulberry32(3);
    const pts = Array.from({ length: 34 }, () => { const x = R(); return [x, 0.15 + 0.65 * x + (R() - 0.5) * 0.3]; });
    return (c, w, h, t) => {
      const px = (x) => 14 + x * (w - 28), py = (y) => h - 12 - y * (h - 24);
      const ph = (t % 5) / 5, k = ease(clamp(ph * 2.2, 0, 1));
      c.strokeStyle = MUTED; c.lineWidth = 1;
      c.beginPath(); c.moveTo(12, 8); c.lineTo(12, h - 10); c.lineTo(w - 8, h - 10); c.stroke();
      if (k >= 1 && ph < 0.92) {
        c.strokeStyle = "rgba(31,111,114,.45)";
        pts.forEach(([x, y]) => { c.beginPath(); c.moveTo(px(x), py(y)); c.lineTo(px(x), py(0.15 + 0.65 * x)); c.stroke(); });
      }
      c.fillStyle = INK;
      pts.forEach(([x, y]) => { c.beginPath(); c.arc(px(x), py(y), 2.3, 0, 7); c.fill(); });
      c.strokeStyle = RED; c.lineWidth = 2;
      c.beginPath(); c.moveTo(px(0), py(0.15)); c.lineTo(px(k), py(0.15 + 0.65 * k)); c.stroke();
    };
  }

  /* 2 · clasificación: la frontera se ajusta y corrige errores */
  function classify() {
    const R = mulberry32(9), pts = [];
    for (let i = 0; i < 40; i++) {
      const a = i % 2, cx = a ? 0.68 : 0.32, cy = a ? 0.62 : 0.38;
      pts.push([cx + (R() - 0.5) * 0.42, cy + (R() - 0.5) * 0.42, a]);
    }
    const thF = -Math.PI / 4, thS = Math.PI / 5;
    const side = (p, th) => Math.sign(Math.cos(th) * (p[1] - 0.5) - Math.sin(th) * (p[0] - 0.5));
    return (c, w, h, t) => {
      const ph = (t % 6) / 6, k = ease(clamp((ph - 0.1) / 0.5, 0, 1));
      const th = thS + (thF - thS) * k;
      const px = (x) => x * w, py = (y) => (1 - y) * h;
      const dx = Math.cos(th), dy = Math.sin(th);
      c.strokeStyle = INK; c.lineWidth = 1.5; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(px(0.5 - dx), py(0.5 - dy)); c.lineTo(px(0.5 + dx), py(0.5 + dy)); c.stroke();
      c.setLineDash([]);
      pts.forEach((p) => {
        const wrong = side(p, th) !== side(p, thF);
        c.beginPath(); c.arc(px(p[0]), py(p[1]), 3, 0, 7);
        if (p[2]) { c.fillStyle = wrong ? RED : INK; c.fill(); }
        else { c.strokeStyle = wrong ? RED : BLUE; c.lineWidth = 1.5; c.stroke(); }
      });
    };
  }

  /* 3 · red neuronal con pulsos */
  function net() {
    const L = [3, 5, 5, 2];
    return (c, w, h, t) => {
      const pos = L.map((n, l) => Array.from({ length: n }, (_, i) => [24 + (l * (w - 48)) / (L.length - 1), h / 2 + (i - (n - 1) / 2) * Math.min(22, (h - 20) / n)]));
      c.strokeStyle = "rgba(23,25,26,.14)"; c.lineWidth = 1;
      for (let l = 0; l < L.length - 1; l++) pos[l].forEach((a) => pos[l + 1].forEach((b) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }));
      for (let k = 0; k < 7; k++) {
        const ph = (t * 0.45 + k / 7) % 1, cyc = Math.floor(t * 0.45 + k / 7);
        const s = Math.min(2, Math.floor(ph * 3)), u = ph * 3 - s;
        const R = mulberry32(cyc * 31 + k * 7 + s);
        const a = pos[s][(R() * L[s]) | 0], b = pos[s + 1][(R() * L[s + 1]) | 0];
        c.fillStyle = k % 3 ? RED : BLUE;
        c.beginPath(); c.arc(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 2.6, 0, 7); c.fill();
      }
      pos.flat().forEach(([x, y]) => { c.fillStyle = "#f7f2e8"; c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.stroke(); });
    };
  }

  /* 4 · visión: búsqueda y detección */
  function vision() {
    const R = mulberry32(5), cols = 30, rows = 11;
    const val = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const dx = (q / cols - 0.7) * 2.6, dy = (r / rows - 0.5) * 1.1;
      const blob = Math.exp(-(dx * dx + dy * dy) * 5);
      val.push(clamp(0.12 + 0.18 * (q / cols) + blob * 0.75 + (R() - 0.5) * 0.12, 0, 1));
    }
    const fills = val.map((v) => `rgba(23,25,26,${v * 0.7})`); // colores fijos: se arman una sola vez
    return (c, w, h, t) => {
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        c.fillStyle = fills[r * cols + q];
        c.fillRect(q * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
      }
      const ph = t % 5;
      let bx, by, bw = w * 0.3, bh = h * 0.62, locked = ph > 2.6;
      if (!locked) { const u = ph / 2.6; bx = w * (0.05 + 0.6 * u); by = h * (0.12 + 0.12 * Math.sin(u * 9)); }
      else { bx = w * 0.7 - bw / 2; by = h * 0.5 - bh / 2; }
      c.strokeStyle = locked ? RED : "#f7f2e8"; c.lineWidth = 1.6;
      c.strokeRect(bx, by, bw, bh);
      if (locked) {
        c.fillStyle = RED; c.fillRect(bx, by - 15, 84, 15);
        c.fillStyle = "#f7f2e8"; c.font = MONO; c.fillText("cenote 0.94", bx + 5, by - 4);
      }
    };
  }

  /* 5 · lenguaje: atención entre español y maya */
  function nlp() {
    const top = ["¿Cómo", "estás?"], bot = ["Bix", "a", "beel?"];
    return (c, w, h, t) => {
      c.font = '500 12px "JetBrains Mono", monospace';
      const lay = (arr, y) => {
        const ws = arr.map((s) => c.measureText(s).width + 16), total = ws.reduce((a, b) => a + b, 0) + (arr.length - 1) * 8;
        let x = (w - total) / 2;
        return arr.map((s, i) => { const r = { s, x, y, w: ws[i] }; x += ws[i] + 8; return r; });
      };
      const A = lay(top, 18), B = lay(bot, h - 42);
      B.forEach((b, j) => A.forEach((a, i) => {
        const wgt = Math.max(0, Math.cos(t * 1.4 + i * 1.7 + j * 2.2));
        c.strokeStyle = `rgba(196,70,42,${0.08 + wgt * 0.7})`; c.lineWidth = 0.6 + wgt * 2;
        const x1 = a.x + a.w / 2, x2 = b.x + b.w / 2;
        c.beginPath(); c.moveTo(x1, a.y + 24); c.bezierCurveTo(x1, h / 2, x2, h / 2, x2, b.y); c.stroke();
      }));
      const chip = (r, dark) => {
        c.fillStyle = dark ? INK : "#f7f2e8"; c.strokeStyle = INK; c.lineWidth = 1;
        c.beginPath(); c.roundRect ? c.roundRect(r.x, r.y, r.w, 24, 6) : c.rect(r.x, r.y, r.w, 24); c.fill(); c.stroke();
        c.fillStyle = dark ? "#f7f2e8" : INK; c.fillText(r.s, r.x + 8, r.y + 16);
      };
      A.forEach((r) => chip(r, false)); B.forEach((r) => chip(r, true));
    };
  }

  /* 6 · generativa: del ruido a una hilera de pirámides */
  function gen() {
    const cols = 36, rows = 10;
    const target = (q, r) => { const l = q % 12, hgt = Math.min(l, 11 - l) + 1; return r >= rows - hgt - 1 && r < rows - 1 ? 1 : 0; };
    return (c, w, h, t) => {
      const ph = (t % 6) / 6, k = ph < 0.65 ? ease(ph / 0.65) : 1;
      const R = mulberry32(Math.floor(t * 10));
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const v = R() * (1 - k) + target(q, r) * k;
        c.fillStyle = k > 0.97 && target(q, r) ? `rgba(31,111,114,${0.4 + v * 0.6})` : `rgba(23,25,26,${v * 0.85})`;
        c.fillRect(q * cw + 0.5, r * ch + 0.5, cw - 1, ch - 1);
      }
      c.fillStyle = INK; c.font = MONO;
      c.fillText(`paso ${String(Math.round((1 - k) * 50)).padStart(2, "0")}/50`, 6, 12);
    };
  }

  /* 7 · serie de tiempo con pronóstico */
  function series() {
    const f = (x) => 0.5 + 0.22 * Math.sin(x * 0.9) + 0.1 * Math.sin(x * 2.3 + 1) + 0.05 * Math.sin(x * 5.1);
    return (c, w, h, t) => {
      const now = w * 0.68, n = 70, py = (v) => h - 14 - v * (h - 28);
      c.strokeStyle = MUTED; c.lineWidth = 1; c.setLineDash([2, 3]);
      c.beginPath(); c.moveTo(now, 6); c.lineTo(now, h - 6); c.stroke(); c.setLineDash([]);
      const xAt = (i) => (i / n) * w, val = (i) => f(i * 0.12 + t * 0.8);
      const iNow = Math.round((now / w) * n);
      c.fillStyle = "rgba(196,70,42,.1)";
      c.beginPath();
      for (let i = iNow; i <= n; i++) c.lineTo(xAt(i), py(val(i) + 0.03 + (i - iNow) * 0.004));
      for (let i = n; i >= iNow; i--) c.lineTo(xAt(i), py(val(i) - 0.03 - (i - iNow) * 0.004));
      c.fill();
      c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath();
      for (let i = 0; i <= iNow; i++) c.lineTo(xAt(i), py(val(i)));
      c.stroke();
      c.strokeStyle = RED; c.setLineDash([4, 3]); c.beginPath();
      for (let i = iNow; i <= n; i++) c.lineTo(xAt(i), py(val(i)));
      c.stroke(); c.setLineDash([]);
      c.fillStyle = INK; c.font = MONO; c.fillText("hoy", now + 4, 14);
    };
  }

  /* 8 · MLOps: pipeline */
  function ops() {
    const steps = ["datos", "entrenar", "evaluar", "api"];
    return (c, w, h, t) => {
      const bw = (w - 30) / 4 - 8, y = h / 2 - 16, xs = steps.map((_, i) => 15 + i * (bw + 32 / 3));
      const ph = (t * 0.35) % 1, pos = ph * 4;
      c.strokeStyle = MUTED; c.lineWidth = 1;
      c.beginPath(); c.moveTo(xs[0] + bw / 2, h / 2); c.lineTo(xs[3] + bw / 2, h / 2); c.stroke();
      c.font = MONO;
      steps.forEach((s, i) => {
        const on = pos >= i && pos < i + 1;
        c.fillStyle = on ? INK : "#f7f2e8"; c.strokeStyle = INK;
        c.beginPath(); c.roundRect ? c.roundRect(xs[i], y, bw, 32, 6) : c.rect(xs[i], y, bw, 32); c.fill(); c.stroke();
        c.fillStyle = on ? "#f7f2e8" : INK;
        const tw = c.measureText(s).width; c.fillText(s, xs[i] + (bw - tw) / 2, y + 20);
      });
      const x = xs[0] + bw / 2 + (xs[3] - xs[0]) * ph;
      c.fillStyle = RED; c.beginPath(); c.arc(x, y + 46, 3, 0, 7); c.fill();
      c.fillStyle = MUTED; c.fillText("v1.3", 15, h - 10);
      c.fillStyle = ph > 0.8 ? "#2f7a4f" : MUTED; c.fillText(ph > 0.8 ? "desplegado ✓" : "en curso…", w - 95, h - 10);
    };
  }

  /* Visor (mock oscuro, estilo herramienta de datos) */
  function viewer() {
    const series = [
      { col: "#6cc3c0", f: (x) => 0.62 + 0.14 * Math.sin(x * 0.7) + 0.05 * Math.sin(x * 3.1) },
      { col: "#d99a2b", f: (x) => 0.42 + 0.18 * Math.sin(x * 0.45 + 2) + 0.03 * Math.sin(x * 6) },
      { col: "#e0694b", f: (x) => 0.22 + 0.06 * Math.sin(x * 0.25 + 1) + 0.02 * Math.sin(x * 4.2) },
    ];
    return (c, w, h, t) => {
      c.strokeStyle = "rgba(238,231,217,.08)"; c.lineWidth = 1;
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(0, (h * i) / 5); c.lineTo(w, (h * i) / 5); c.stroke(); }
      for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo((w * i) / 8, 0); c.lineTo((w * i) / 8, h); c.stroke(); }
      const n = 120;
      series.forEach((s) => {
        c.strokeStyle = s.col; c.lineWidth = 1.6; c.beginPath();
        for (let i = 0; i <= n; i++) c.lineTo((i / n) * w, h - s.f(i * 0.09 + t * 0.6) * h);
        c.stroke();
        const y = h - s.f(n * 0.09 + t * 0.6) * h;
        c.fillStyle = s.col; c.beginPath(); c.arc(w - 3, y, 3, 0, 7); c.fill();
      });
      c.fillStyle = "rgba(238,231,217,.5)"; c.font = MONO;
      c.fillText("t = " + (t * 12).toFixed(1) + " s", 8, 14);
    };
  }

  const REG = { scatter, classify, net, vision, nlp, gen, series, ops, viewer };

  function init(reduced) {
    const items = [];
    document.querySelectorAll("canvas[data-viz]").forEach((cv) => {
      const make = REG[cv.dataset.viz];
      if (!make) return;
      items.push({ cv, ctx: cv.getContext("2d"), draw: make(), visible: false, w: 0, h: 0 });
    });
    const fit = (it) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      it.w = it.cv.clientWidth; it.h = it.cv.clientHeight;
      it.cv.width = Math.round(it.w * dpr); it.cv.height = Math.round(it.h * dpr);
      it.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const paint = (it, t) => { it.ctx.clearRect(0, 0, it.w, it.h); it.draw(it.ctx, it.w, it.h, t); };
    items.forEach(fit);
    window.addEventListener("resize", () => items.forEach((it) => { fit(it); paint(it, performance.now() / 1000); }));

    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const it = items.find((i) => i.cv === e.target);
      if (it) it.visible = e.isIntersecting;
    }), { rootMargin: "80px" });
    items.forEach((it) => io.observe(it.cv));

    if (reduced) {
      // sin animación: un fotograma representativo
      document.fonts && document.fonts.ready.then(() => items.forEach((it) => paint(it, 3.2)));
      items.forEach((it) => paint(it, 3.2));
      return;
    }
    (function loop() {
      const t = performance.now() / 1000;
      items.forEach((it) => { if (it.visible) paint(it, t); });
      requestAnimationFrame(loop);
    })();
  }

  window.MaiasViz = { init };
})();
