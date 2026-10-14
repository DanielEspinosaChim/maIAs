/* =========================================================
   Escena de partículas: un solo sistema de puntos que se
   transforma con el scroll entre seis figuras:
   0 · Pirámide de K'uk'ulkan  1 · Ruedas del Tzolk'in
   2 · Ciclo de Venus          3 · Red neuronal
   4 · Cerebro                 5 · Cenote
   ========================================================= */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const COL = {
    stone: [0.93, 0.9, 0.84],
    stoneDim: [0.42, 0.45, 0.43],
    red: [0.88, 0.41, 0.29],
    blue: [0.42, 0.76, 0.75],
    amber: [0.88, 0.62, 0.2],
  };
  const TAU = Math.PI * 2;

  function makeBuffer(N) {
    const P = new Float32Array(N * 3);
    const C = new Float32Array(N * 3);
    let k = 0;
    return {
      P, C,
      get full() { return k >= N; },
      put(x, y, z, c, m) {
        if (k >= N) return;
        m = m == null ? 1 : m;
        P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
        C[k * 3] = c[0] * m; C[k * 3 + 1] = c[1] * m; C[k * 3 + 2] = c[2] * m;
        k++;
      },
    };
  }

  /* ---------- 0 · El Castillo, Chichén Itzá ---------- */
  function pyramid(N, R) {
    const b = makeBuffer(N);
    const tiers = 9, th = 0.6, y0 = -3.0, bH = 6.2, tH = 2.6, H = tiers * th;
    const half = (i) => bH - (bH - tH) * (i / (tiers - 1));
    const sq = (h, y) => {
      const t = R() * 4, s = t | 0, u = (t - s) * 2 - 1;
      return s === 0 ? [u * h, y, h] : s === 1 ? [h, y, u * h] : s === 2 ? [u * h, y, -h] : [-h, y, u * h];
    };
    const side = (s, w, y, d) => (s === 0 ? [w, y, d] : s === 1 ? [d, y, -w] : s === 2 ? [-w, y, -d] : [-d, y, w]);
    const stone = () => (R() < 0.06 ? COL.blue : COL.stone);

    while (!b.full) {
      const r = R();
      if (r < 0.34) {
        // aristas de los nueve cuerpos (con talud)
        const i = (R() * tiers) | 0, h = half(i), yb = y0 + i * th, yt = yb + th, ht = h - 0.18;
        const e = R();
        if (e < 0.45) b.put(...sq(ht, yt), stone());
        else if (e < 0.8) b.put(...sq(h, yb), stone());
        else {
          const u = R(), hh = h + (ht - h) * u;
          b.put((R() < 0.5 ? -1 : 1) * hh, yb + u * th, (R() < 0.5 ? -1 : 1) * hh, stone());
        }
      } else if (r < 0.43) {
        // caras (tableros), tenues
        const i = (R() * tiers) | 0, u = R(), h = half(i), hh = h - 0.18 * u;
        b.put(...sq(hh, y0 + i * th + u * th), COL.stone, 0.45);
      } else if (r < 0.71) {
        // cuatro escalinatas de 91 escalones (+1 = 365)
        const s = (R() * 4) | 0, step = (R() * 91) | 0, f = step / 91;
        let y = y0 + f * H;
        const d = bH + 1.1 + (tH - (bH + 1.1)) * f;
        const bal = R() < 0.24;
        const w = bal ? (R() < 0.5 ? -1 : 1) * 1.25 : (R() * 2 - 1) * 1.05;
        if (bal) y += 0.25;
        b.put(...side(s, w, y, d), bal ? COL.red : COL.stone, bal ? 1 : 0.95);
      } else if (r < 0.81) {
        // templo superior
        const h = 1.6, yb = y0 + H, ht = 1.45, e = R();
        if (e < 0.35) b.put(...sq(h, yb + ht), COL.stone);
        else if (e < 0.6) b.put(...sq(h, yb), COL.stone);
        else if (e < 0.85) b.put((R() < 0.5 ? -1 : 1) * h, yb + R() * ht, (R() < 0.5 ? -1 : 1) * h, COL.stone);
        else b.put(...sq(h * 0.55, yb + ht + 0.35), COL.red);
      } else {
        // plano de datos (retícula)
        const L = 15;
        let x, z;
        if (R() < 0.5) { x = Math.round((R() * 2 - 1) * 7.5) * 2; z = (R() * 2 - 1) * L; }
        else { z = Math.round((R() * 2 - 1) * 7.5) * 2; x = (R() * 2 - 1) * L; }
        const dist = Math.hypot(x, z);
        const m = Math.max(0, 1 - dist / 16);
        b.put(x, y0 - 0.02, z, COL.blue, 0.15 + m * 0.6);
      }
    }
    return { P: b.P, C: b.C };
  }

  /* ---------- 1 · Tzolk'in: 13 números × 20 días ---------- */
  const GA = [-4.0, 0], GB = [4.05, 0];
  function gears(N, R) {
    const b = makeBuffer(N);
    const G = new Float32Array(N);
    let gi = 0;
    function wheel(c, r, teeth, phase, accent, id) {
      const t = R();
      const z = R() < 0.5 ? 0.32 : -0.32;
      let a, rr, x, y, col = COL.stone, m = 1;
      if (t < 0.22) { a = R() * TAU; rr = r; }
      else if (t < 0.33) { a = R() * TAU; rr = r * 0.8; }
      else if (t < 0.6) {
        // dientes
        const j = (R() * teeth) | 0, ac = (TAU * (j + phase)) / teeth, hw = (Math.PI / teeth) * 0.55, e = R();
        if (e < 0.5) { a = ac + (R() * 2 - 1) * hw * 0.85; rr = r + 0.45; }
        else { a = ac + (e < 0.75 ? -hw : hw); rr = r + R() * 0.45; }
      } else if (t < 0.73) {
        // rayos
        const k = (R() * 6) | 0; a = (TAU * k) / 6 + 0.26; rr = r * (0.2 + R() * 0.6); m = 0.75;
      } else if (t < 0.81) { a = R() * TAU; rr = r * 0.2; }
      else {
        // casillas de los días (glifos)
        const j = (R() * teeth) | 0, ac = (TAU * (j + phase + 0.5)) / teeth, q = R() * TAU, s = 0.14;
        x = c[0] + Math.cos(ac) * r * 0.9 + Math.cos(q) * s;
        y = c[1] + Math.sin(ac) * r * 0.9 + Math.sin(q) * s;
        b.put(x, y, z, accent);
        G[gi++] = id;
        return;
      }
      b.put(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, z, col, m);
      G[gi++] = id;
    }
    while (!b.full) {
      if (R() < 0.4) wheel(GA, 3.0, 13, 0, COL.blue, 1);
      else wheel(GB, 4.6, 20, 0.5, COL.red, -1);
    }
    return { P: b.P, C: b.C, G };
  }

  /* ---------- 2 · Venus: 5 ciclos sinódicos = 8 años ---------- */
  function venus(N, R) {
    const b = makeBuffer(N);
    const rE = 6.4, rV = 4.63, pV = 0.61519;
    while (!b.full) {
      const r = R();
      if (r < 0.1) {
        const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u), rr = 0.9 + R() * 0.15;
        b.put(Math.cos(a) * s * rr, u * rr, Math.sin(a) * s * rr, COL.amber);
      } else if (r < 0.32) {
        const a = R() * TAU, isV = R() < 0.5, rr = isV ? rV : rE;
        b.put(Math.cos(a) * rr, (R() - 0.5) * 0.05, Math.sin(a) * rr, isV ? COL.blue : COL.stone);
      } else if (r < 0.76) {
        // líneas Tierra–Venus cada ~18 días: dibujan la "flor de Venus"
        const m = (R() * 160) | 0, t = (m * 8) / 160, u = R();
        const ex = Math.cos(TAU * t) * rE, ez = Math.sin(TAU * t) * rE;
        const vx = Math.cos((TAU * t) / pV) * rV, vz = Math.sin((TAU * t) / pV) * rV;
        b.put(ex + (vx - ex) * u, 0, ez + (vz - ez) * u, R() < 0.3 ? COL.blue : COL.stone, 0.55);
      } else if (r < 0.81) {
        const isV = R() < 0.5, c = isV ? [rV * Math.cos(2.2), 0, rV * Math.sin(2.2)] : [rE, 0, 0];
        const q = R() * TAU, w = R() * Math.PI, s = 0.32;
        b.put(c[0] + Math.cos(q) * Math.sin(w) * s, Math.cos(w) * s, c[2] + Math.sin(q) * Math.sin(w) * s, isV ? COL.blue : COL.red);
      } else if (r < 0.89) {
        const a = (Math.floor(R() * 64) + R() * 0.45) * (TAU / 64);
        b.put(Math.cos(a) * 9.6, 0, Math.sin(a) * 9.6, COL.stone, 0.5);
      } else {
        const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u), rr = 13 + R() * 7;
        b.put(Math.cos(a) * s * rr, u * rr * 0.6, Math.sin(a) * s * rr, COL.stone, 0.4);
      }
    }
    return { P: b.P, C: b.C };
  }

  /* ---------- 3 · Red neuronal ---------- */
  function net(N, R) {
    const b = makeBuffer(N);
    const sizes = [9, 16, 16, 9, 4], xs = [-8, -4, 0, 4, 8], sp = 1.5;
    const layers = sizes.map((n, l) => {
      const s = Math.round(Math.sqrt(n)), nodes = [];
      for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) nodes.push([xs[l], (i - (s - 1) / 2) * sp, (j - (s - 1) / 2) * sp]);
      return nodes;
    });
    const edges = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const cnt = l === 3 ? 24 : 36;
      for (let e = 0; e < cnt; e++) {
        edges.push([layers[l][(R() * layers[l].length) | 0], layers[l + 1][(R() * layers[l + 1].length) | 0]]);
      }
    }
    while (!b.full) {
      if (R() < 0.36) {
        const l = (R() * layers.length) | 0, n = layers[l][(R() * layers[l].length) | 0];
        const q = R() * TAU, w = Math.acos(R() * 2 - 1), s = 0.24;
        b.put(n[0] + Math.cos(q) * Math.sin(w) * s, n[1] + Math.cos(w) * s, n[2] + Math.sin(q) * Math.sin(w) * s,
          l === layers.length - 1 ? COL.red : COL.stone);
      } else {
        const [a, c] = edges[(R() * edges.length) | 0], u = R();
        b.put(a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u, a[2] + (c[2] - a[2]) * u, R() < 0.25 ? COL.blue : COL.stone, 0.5);
      }
    }
    return { P: b.P, C: b.C };
  }

  /* ---------- 4 · Cerebro: perfil en malla (nodos unidos a sus vecinos), cerebelo y tallo ---------- */
  function brain(N, R) {
    const b = makeBuffer(N);
    const A = 5.2, B = 3.4, C = 2.3;
    // superficie del cerebro: elipsoide con lóbulo temporal, frente más angosta y base plana
    const surf = (dx, dy, dz) => {
      const x = A * dx;
      let y = B * dy * (dy < 0 ? 0.58 : 1) + 0.4;
      if (dy < 0) y -= 0.9 * Math.exp(-(((x - 1.3) / 1.7) ** 2)) * -dy;
      return [x, y, C * dz * (1 - 0.18 * Math.max(0, x) / A)];
    };
    const rndDir = () => { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u); return [Math.cos(a) * s, u, Math.sin(a) * s]; };

    // nodos repartidos con distancia mínima (malla uniforme) y sus 3 vecinos más cercanos
    const nodes = [], MIN = 0.62;
    for (let k = 0; k < 4000 && nodes.length < 460; k++) {
      const p = surf(...rndDir());
      if (nodes.every((q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 > MIN * MIN)) nodes.push(p);
    }
    const edges = [];
    nodes.forEach((p, i) => {
      nodes.map((q, j) => [j, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2])
        .filter(([j]) => j !== i).sort((u, v) => u[1] - v[1]).slice(0, 3)
        .forEach(([j]) => edges.push([p, nodes[j]]));
    });

    const blue = (m) => (R() < 0.12 ? COL.stone : COL.blue);
    while (!b.full) {
      const r = R();
      if (r < 0.42) {
        // aristas de la malla
        const [p, q] = edges[(R() * edges.length) | 0], u = R();
        b.put(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u, blue(), 0.55 + R() * 0.45);
      } else if (r < 0.5) {
        // nodos (puntos brillantes)
        const p = nodes[(R() * nodes.length) | 0], a = R() * TAU, w = Math.acos(R() * 2 - 1), s = 0.12;
        b.put(p[0] + Math.cos(a) * Math.sin(w) * s, p[1] + Math.cos(w) * s, p[2] + Math.sin(a) * Math.sin(w) * s, COL.stone, 1);
      } else if (r < 0.57) {
        // piel tenue de la corteza
        const p = surf(...rndDir());
        b.put(p[0], p[1], p[2], COL.blue, 0.3);
      } else if (r < 0.71) {
        // interior: cuerpo calloso y anillos del sistema límbico
        const k = R();
        if (k < 0.4) {
          const t = R();
          b.put(-2.8 + t * 5.6, 0.7 + 1.3 * Math.pow(Math.sin(Math.PI * t), 0.8), (R() - 0.5) * 0.7, R() < 0.3 ? COL.amber : COL.blue, 0.95);
        } else {
          const ring = k < 0.7 ? [2.6, 1.5] : [1.8, 1.0], a = 0.15 * Math.PI + R() * 1.7 * Math.PI;
          b.put(Math.cos(a) * ring[0], 0.2 + Math.sin(a) * ring[1], (R() - 0.5) * 0.8, COL.blue, 0.85);
        }
      } else if (r < 0.85) {
        // cerebelo: anillos concéntricos
        const rr = [0.35, 0.7, 1.05, 1.4][(R() * 4) | 0], a = R() * TAU;
        b.put(-2.9 + Math.cos(a) * rr, -2.5 + Math.sin(a) * rr, (R() * 2 - 1) * 1.3 * Math.sqrt(Math.max(0, 1 - (rr / 1.5) ** 2)), COL.blue, 0.9);
      } else if (r < 0.91) {
        // tallo cerebral: anillos y líneas a lo largo
        const t = R(), ring = R() < 0.5, a = ring ? R() * TAU : ((R() * 6) | 0) * (TAU / 6);
        const tt = ring ? ((R() * 9) | 0) / 8 : t;
        b.put(-0.9 - tt * 0.7 + Math.cos(a) * 0.5, -2.3 - tt * 3.1, Math.sin(a) * 0.5, COL.blue, 0.75);
      } else {
        // conexiones profundas entre nodos lejanos
        const p = nodes[(R() * nodes.length) | 0], q = nodes[(R() * nodes.length) | 0], u = R(), m = (1 - u) * (1 - u), n = 2 * u * (1 - u), o = u * u;
        const cx = (p[0] + q[0]) * 0.2, cy = (p[1] + q[1]) * 0.2 + 0.2, cz = (p[2] + q[2]) * 0.2;
        b.put(m * p[0] + n * cx + o * q[0], m * p[1] + n * cy + o * q[1], m * p[2] + n * cz + o * q[2], COL.blue, 0.5);
      }
    }
    return { P: b.P, C: b.C };
  }

  /* ---------- 5 · Cenote: pozo con estratos, raíces, agua y haz de luz ---------- */
  function cenote(N, R) {
    const b = makeBuffer(N);
    const Y0 = -3.8, Y1 = 4.0;
    const rad = (y) => { const t = (Y1 - y) / (Y1 - Y0); return 3.0 + 1.9 * t * t * (3 - 2 * t); }; // se ensancha hacia abajo
    const rough = (a, y) => 0.18 * Math.sin(5 * a + y * 1.7) + 0.1 * Math.sin(11 * a - y * 2.9);
    const px = 0.913, py = 0.409; // perpendicular al eje inclinado del haz
    while (!b.full) {
      const r = R();
      if (r < 0.3) {
        // estratos de caliza
        const j = (R() * 14) | 0, y = Y0 + 0.25 + j * 0.52 + (R() - 0.5) * 0.05, a = R() * TAU, rr = rad(y) + rough(a, y);
        b.put(Math.cos(a) * rr, y, Math.sin(a) * rr, j % 4 === 0 ? COL.stone : COL.stoneDim, j % 4 === 0 ? 0.95 : 0.8);
      } else if (r < 0.4) {
        // pared (relleno tenue)
        const y = Y0 + R() * (Y1 - Y0), a = R() * TAU, rr = rad(y) + rough(a, y);
        b.put(Math.cos(a) * rr, y, Math.sin(a) * rr, COL.stone, 0.28);
      } else if (r < 0.46) {
        // grietas verticales
        const a = ((R() * 18) | 0) * (TAU / 18) + 0.05 * Math.sin(R() * 9), y = Y0 + R() * (Y1 - Y0), rr = rad(y) + rough(a, y);
        b.put(Math.cos(a) * rr, y, Math.sin(a) * rr, COL.stoneDim, 0.8);
      } else if (r < 0.6) {
        // agua: ondas concéntricas y superficie
        const a = R() * TAU;
        if (R() < 0.55) { const rr = (1 + ((R() * 7) | 0)) * 0.62; b.put(Math.cos(a) * rr, Y0 + 0.02, Math.sin(a) * rr, COL.blue, 1); }
        else { const rr = Math.sqrt(R()) * 4.4; b.put(Math.cos(a) * rr, Y0, Math.sin(a) * rr, COL.blue, 0.3); }
      } else if (r < 0.68) {
        // brocal y terreno
        const a = R() * TAU;
        if (R() < 0.45) { const rr = 3.0 + rough(a, Y1) * 1.2; b.put(Math.cos(a) * rr, Y1 + (R() - 0.5) * 0.1, Math.sin(a) * rr, COL.stone, 1); }
        else {
          let rr, aa = a;
          if (R() < 0.6) rr = 3.6 + ((R() * 6) | 0) * 1.0;
          else { aa = ((R() * 24) | 0) * (TAU / 24); rr = 3.4 + R() * 6.5; }
          b.put(Math.cos(aa) * rr, Y1, Math.sin(aa) * rr, COL.stone, Math.max(0.12, 0.45 * (1 - (rr - 3) / 8)));
        }
      } else if (r < 0.81) {
        // haz de luz que entra por la abertura
        const t = R(), cx = -2.2 + t * 3.4, cy = Y1 + t * (Y0 - Y1 + 0.2), rad2 = 0.35 + t * 1.4;
        const a = R() * TAU, rho = rad2 * (R() < 0.5 ? 1 : Math.sqrt(R()));
        const u = Math.cos(a) * rho, w = Math.sin(a) * rho;
        b.put(cx + px * u, cy + py * u, w, COL.amber, 0.35 + 0.5 * (rho / rad2));
      } else {
        // raíces que cuelgan desde el brocal
        const i = (R() * 12) | 0, a0 = (i * TAU) / 12 + 0.2 * Math.sin(i * 3.1), u = R(), len = 3.5 + ((i * 7) % 5) * 1.0;
        const y = Y1 - u * len, rr = rad(y) - 0.2 - 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.2)), a = a0 + 0.35 * Math.sin(u * 7 + i);
        b.put(Math.cos(a) * rr, y, Math.sin(a) * rr, i % 5 === 0 ? COL.red : COL.stone, 0.75);
      }
    }
    return { P: b.P, C: b.C };
  }

  const VERT = `
    uniform float uMorph, uTime, uSize, uPixel, uIntro;
    uniform vec2 uGA, uGB;
    attribute vec3 p1, p2, p3, p4, p5, c0, c1, c2, c3, c4, c5;
    attribute float aRand, aGear;
    varying vec3 vC; varying float vA;
    float seg(float k){ return smoothstep(0., 1., clamp((uMorph - k) * 1.5 - aRand * 0.5, 0., 1.)); }
    vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }
    void main(){
      vec3 q1 = p1;
      if (aGear > 0.5) q1.xy = uGA + rot(p1.xy - uGA, uTime * 0.3);
      else if (aGear < -0.5) q1.xy = uGB + rot(p1.xy - uGB, -uTime * 0.3 * 3.0 / 4.6);
      float t1 = seg(0.), t2 = seg(1.), t3 = seg(2.), t4 = seg(3.), t5 = seg(4.);
      vec3 p = mix(position, q1, t1); p = mix(p, p2, t2); p = mix(p, p3, t3); p = mix(p, p4, t4); p = mix(p, p5, t5);
      vec3 c = mix(c0, c1, t1); c = mix(c, c2, t2); c = mix(c, c3, t3); c = mix(c, c4, t4); c = mix(c, c5, t5);
      vec3 dir = normalize(vec3(sin(aRand*91.7), cos(aRand*47.3), sin(aRand*13.1 + 1.)));
      float sc = sin(t1*3.14159) + sin(t2*3.14159) + sin(t3*3.14159) + sin(t4*3.14159) + sin(t5*3.14159);
      p += dir * sc * (1.2 + aRand * 3.0);
      p += 0.05 * vec3(sin(uTime*.9 + aRand*40.), cos(uTime*.7 + aRand*30.), sin(uTime*.8 + aRand*20.));
      p = mix(dir * (24. + aRand * 24.), p, uIntro);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPixel * (0.55 + aRand * 0.9) * (30. / -mv.z);
      vC = c;
      vA = uIntro * clamp(1.35 - (-mv.z - 22.) / 22., 0.3, 1.);
    }`;
  const FRAG = `
    varying vec3 vC; varying float vA;
    void main(){
      float r = length(gl_PointCoord - .5);
      if (r > .5) discard;
      gl_FragColor = vec4(vC, smoothstep(.5, .1, r) * vA);
    }`;

  // Encuadre por escena (escritorio / móvil)
  const DESK = { x: [5.4, 5.6, 5.4, 5.2, 5.3, 5.3], y: [1.1, 0.9, 0.9, 0.9, 1.7, 0.6], rx: [0.3, 0.05, 0.85, 0.18, 0.03, 0.4], s: [0.8, 0.74, 0.8, 0.78, 1.2, 0.72], lock: [0, 1, 0, 0.7, 1, 0], ry: [0, 0, 0, -0.55, 0, 0] };
  const MOB = { x: [0, 0, 0, 0, 0, 0], y: [5.2, 5.4, 5.2, 5.2, 5.8, 5.0], rx: [0.3, 0.05, 0.85, 0.18, 0.03, 0.4], s: [0.5, 0.42, 0.45, 0.44, 0.66, 0.42], lock: [0, 1, 0, 0.7, 1, 0], ry: [0, 0, 0, -0.55, 0, 0] };

  function create(canvas, opts) {
    if (!window.THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch (e) { return null; }

    const mobile = opts.mobile;
    const N = mobile ? 5200 : 9000;
    const R = mulberry32(20);
    const s0 = pyramid(N, R), s1 = gears(N, R), s2 = venus(N, R), s3 = net(N, R);
    const R2 = mulberry32(21); // generador aparte: las cuatro figuras originales no cambian
    const s4 = brain(N, R2), s5 = cenote(N, R2);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(s0.P, 3));
    geo.setAttribute("p1", new THREE.BufferAttribute(s1.P, 3));
    geo.setAttribute("p2", new THREE.BufferAttribute(s2.P, 3));
    geo.setAttribute("p3", new THREE.BufferAttribute(s3.P, 3));
    geo.setAttribute("p4", new THREE.BufferAttribute(s4.P, 3));
    geo.setAttribute("p5", new THREE.BufferAttribute(s5.P, 3));
    geo.setAttribute("c0", new THREE.BufferAttribute(s0.C, 3));
    geo.setAttribute("c1", new THREE.BufferAttribute(s1.C, 3));
    geo.setAttribute("c2", new THREE.BufferAttribute(s2.C, 3));
    geo.setAttribute("c3", new THREE.BufferAttribute(s3.C, 3));
    geo.setAttribute("c4", new THREE.BufferAttribute(s4.C, 3));
    geo.setAttribute("c5", new THREE.BufferAttribute(s5.C, 3));
    geo.setAttribute("aGear", new THREE.BufferAttribute(s1.G, 1));
    const rnd = new Float32Array(N);
    for (let i = 0; i < N; i++) rnd[i] = R();
    geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));

    const uniforms = {
      uMorph: { value: 0 }, uTime: { value: 0 }, uIntro: { value: 0 },
      uSize: { value: mobile ? 2.6 : 2.4 }, uPixel: { value: 1 },
      uGA: { value: new THREE.Vector2(GA[0], GA[1]) }, uGB: { value: new THREE.Vector2(GB[0], GB[1]) },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;

    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.add(points);
    scene.add(group);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    camera.position.set(0, 1.5, 30);
    camera.lookAt(0, 0, 0);

    let F = mobile ? MOB : DESK; // se reevalúa en resize(): si cambia el ancho de la ventana, cambia el encuadre
    const ease = (t) => t * t * (3 - 2 * t);
    const pick = (arr, m) => {
      const i = Math.min(arr.length - 2, Math.floor(m)), f = ease(Math.min(1, m - i));
      return arr[i] + (arr[i + 1] - arr[i]) * f;
    };

    let spin = 0, mx = 0, my = 0;
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      F = w <= 820 ? MOB : DESK;
      const pr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      uniforms.uPixel.value = pr;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();

    return {
      resize,
      uniforms,
      render(dt, morph, mouse) {
        uniforms.uMorph.value = morph;
        uniforms.uTime.value += dt;
        mx += (mouse.x - mx) * Math.min(1, dt * 3);
        my += (mouse.y - my) * Math.min(1, dt * 3);
        const lock = pick(F.lock, morph);
        spin += dt * 0.12 * (1 - lock);
        const near = Math.round(spin / TAU) * TAU;
        spin += (near - spin) * lock * Math.min(1, dt * 2.5);
        group.position.set(pick(F.x, morph), pick(F.y, morph), 0);
        group.scale.setScalar(pick(F.s, morph));
        group.rotation.set(pick(F.rx, morph) + my * 0.12, spin + pick(F.ry, morph) * lock + mx * 0.3, 0);
        renderer.render(scene, camera);
      },
    };
  }

  window.MaiasScene = { create };
})();
