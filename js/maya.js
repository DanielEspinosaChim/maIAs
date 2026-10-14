/* Numeración maya: base 20, punto (1), barra (5) y concha (0). */
(function () {
  const W = 64;     // ancho del viewBox
  const LVL = 46;   // alto de cada nivel posicional
  const GAP = 10;   // separación entre niveles

  function digitParts(d, top) {
    if (d === 0) {
      const cy = top + LVL / 2;
      return (
        `<path d="M8 ${cy} C 16 ${cy - 14}, 48 ${cy - 14}, 56 ${cy} C 48 ${cy + 11}, 16 ${cy + 11}, 8 ${cy} Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>` +
        `<path d="M19 ${cy - 3} Q32 ${cy - 8} 45 ${cy - 3} M21 ${cy + 3} Q32 ${cy + 6} 43 ${cy + 3}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`
      );
    }
    const bars = Math.floor(d / 5);
    const dots = d % 5;
    const h = (dots ? 10 : 0) + (dots && bars ? 4 : 0) + bars * 8 + Math.max(0, bars - 1) * 4;
    let y = top + (LVL - h) / 2;
    let out = "";
    if (dots) {
      const gap = 12.5;
      const x0 = W / 2 - ((dots - 1) * gap) / 2;
      for (let i = 0; i < dots; i++) out += `<circle cx="${x0 + i * gap}" cy="${y + 5}" r="4.8"/>`;
      y += 10 + (bars ? 4 : 0);
    }
    for (let b = 0; b < bars; b++) {
      out += `<rect x="5" y="${y}" width="54" height="8" rx="2.5"/>`;
      y += 12;
    }
    return out;
  }

  function toBase20(n) {
    n = Math.max(0, Math.floor(n));
    if (n === 0) return [0];
    const digits = [];
    while (n > 0) { digits.unshift(n % 20); n = Math.floor(n / 20); }
    return digits; // más significativo primero (arriba)
  }

  function svg(n, opts) {
    opts = opts || {};
    const digits = toBase20(n);
    const H = digits.length * LVL + (digits.length - 1) * GAP;
    let body = "";
    digits.forEach((d, i) => {
      const top = i * (LVL + GAP);
      const cls = opts.animate ? ` class="lvl" style="animation-delay:${i * 70}ms"` : "";
      body += `<g${cls}>${digitParts(d, top)}</g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" fill="currentColor" role="img" aria-label="${n} en numeración maya">${body}</svg>`;
  }

  window.Maya = { svg, toBase20 };
})();
