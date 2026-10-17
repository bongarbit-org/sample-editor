import { state, setEdit, on } from '../state.js';

const MIN_SEL = 16; // amostras
const HIT = 24; // px de tolerância ao toque nos handles
const LEVELS = [256, 4096];

function buildPeaks(channels) {
  const n = channels[0].length;
  const levels = {};
  for (const B of LEVELS) {
    const m = Math.ceil(n / B);
    const min = new Float32Array(m), max = new Float32Array(m);
    for (let b = 0; b < m; b++) {
      let lo = 1, hi = -1;
      const e = Math.min(n, (b + 1) * B);
      for (const ch of channels) for (let i = b * B; i < e; i++) { const x = ch[i]; if (x < lo) lo = x; if (x > hi) hi = x; }
      min[b] = lo; max[b] = hi;
    }
    levels[B] = { min, max };
  }
  return levels;
}

export function createWaveform(canvas, { getPlayhead, snapEl, infoEl, onCommit }) {
  const g = canvas.getContext('2d');
  let peaks = null; // picos do original
  let proc = null; // { channels, peaks, start, len }: resultado da edição, desenhado dentro da seleção
  const view = { offset: 0, spp: 1 }; // spp = amostras por pixel
  let W = 0, H = 0;
  const pointers = new Map();
  let drag = null; // { type:'start'|'end'|'pan'|'pinch', ... }

  const len = () => (state.audio ? state.audio.channels[0].length : 0);
  const maxSpp = () => Math.max(0.05, len() / Math.max(1, W));
  const clampView = () => {
    view.spp = Math.min(maxSpp(), Math.max(0.05, view.spp));
    view.offset = Math.max(0, Math.min(view.offset, Math.max(0, len() - W * view.spp)));
  };
  const xOf = (s) => (s - view.offset) / view.spp;
  const sOf = (x) => view.offset + x * view.spp;

  function resize() {
    pal = null;
    const dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    clampView(); draw();
  }

  function rangeIn(pk, ch, s0, s1) {
    const span = s1 - s0;
    for (let li = LEVELS.length - 1; li >= 0; li--) {
      const B = LEVELS[li];
      if (span >= B) {
        const { min, max } = pk[B];
        let lo = 1, hi = -1;
        const b1 = Math.min(min.length, Math.ceil(s1 / B));
        for (let b = Math.floor(s0 / B); b < b1; b++) { if (min[b] < lo) lo = min[b]; if (max[b] > hi) hi = max[b]; }
        return [lo, hi];
      }
    }
    let lo = 1, hi = -1;
    for (const c of ch) for (let i = s0; i < s1; i++) { const x = c[i]; if (x < lo) lo = x; if (x > hi) hi = x; }
    return [lo, hi];
  }

  // Dentro da seleção usa o áudio já editado (fades/ganho/normalização); fora, o original.
  function range(s0, s1) {
    const orig = state.audio.channels;
    if (!proc) return rangeIn(peaks, orig, s0, s1);
    let lo = 1, hi = -1;
    const merge = ([l, h]) => { if (l < lo) lo = l; if (h > hi) hi = h; };
    const a = Math.max(s0, proc.start), b = Math.min(s1, proc.start + proc.len);
    if (a < b) merge(rangeIn(proc.peaks, proc.channels, a - proc.start, b - proc.start));
    const e1 = Math.min(s1, proc.start);
    if (s0 < e1) merge(rangeIn(peaks, orig, s0, e1));
    const e0 = Math.max(s0, proc.start + proc.len);
    if (e0 < s1) merge(rangeIn(peaks, orig, e0, s1));
    return [lo, hi];
  }

  function sampleAt(i) {
    if (proc && i >= proc.start && i < proc.start + proc.len) return proc.channels[0][i - proc.start];
    return state.audio.channels[0][i];
  }

  // Cores vêm dos tokens CSS (design.md) para a forma de onda seguir a identidade visual.
  let pal = null;
  const readPalette = () => {
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    pal = { bg: v('--papel-claro'), line: v('--grafite-18'), ink: v('--preto-grafite'), shade: v('--papel-sombra'),
      start: v('--verde-baoba'), end: v('--terracota-queimada'), head: v('--azul-caixa-dagua'), flagText: v('--papel') };
  };

  function draw() {
    if (!pal) readPalette();
    g.clearRect(0, 0, W, H);
    g.fillStyle = pal.bg; g.fillRect(0, 0, W, H);
    if (!state.audio) return;
    const n = len(), mid = H / 2, amp = H / 2 - 4;
    g.strokeStyle = pal.line; g.lineWidth = 1; g.beginPath(); g.moveTo(0, mid + 0.5); g.lineTo(W, mid + 0.5); g.stroke();

    g.strokeStyle = pal.ink; g.fillStyle = pal.ink; g.lineWidth = 1;
    if (view.spp < 1) { // zoom extremo: polilinha amostra a amostra
      g.beginPath();
      const i0 = Math.max(0, Math.floor(view.offset) - 1), i1 = Math.min(n - 1, Math.ceil(view.offset + W * view.spp) + 1);
      for (let i = i0; i <= i1; i++) { const x = xOf(i), y = mid - sampleAt(i) * amp; i === i0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
      if (view.spp < 0.2) for (let i = i0; i <= i1; i++) g.fillRect(xOf(i) - 2, mid - sampleAt(i) * amp - 2, 4, 4);
    } else {
      for (let x = 0; x < W; x++) {
        const s0 = Math.floor(view.offset + x * view.spp);
        if (s0 >= n) break;
        const s1 = Math.max(s0 + 1, Math.min(n, Math.floor(view.offset + (x + 1) * view.spp)));
        const [lo, hi] = range(s0, s1);
        const h1 = Math.min(1, hi), l1 = Math.max(-1, lo);
        g.fillRect(x, mid - h1 * amp, 1, Math.max(1, (h1 - l1) * amp));
      }
    }

    const { start, end } = state.edit;
    const xs = xOf(start), xe = xOf(end);
    // fora da seleção: papel mais escuro, por cima da onda (translúcido para a onda ainda aparecer)
    g.globalAlpha = 0.72; g.fillStyle = pal.shade;
    g.fillRect(0, 0, Math.max(0, Math.min(W, xs)), H);
    g.fillRect(Math.max(0, Math.min(W, xe)), 0, W, H);
    g.globalAlpha = 1;
    // marcadores: filete de 2px + bandeira quadrada (raio 0), início aponta para dentro da seleção, fim também
    for (const [x, col, dir] of [[xs, pal.start, 1], [xe, pal.end, -1]]) {
      if (x < -2 || x > W + 2) continue;
      g.fillStyle = col; g.fillRect(x - 1, 0, 2, H);
      g.fillRect(dir > 0 ? x : x - 18, 0, 18, 18);
      g.strokeStyle = pal.ink; g.strokeRect((dir > 0 ? x : x - 18) + 0.5, 0.5, 17, 17);
    }
    const ph = getPlayhead && getPlayhead();
    if (ph != null) { const x = xOf(ph); g.fillStyle = pal.head; g.fillRect(x - 1, 0, 2, H); }

    if (infoEl) {
      const sr = state.audio.sampleRate;
      const f = (s) => (s / sr).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' s';
      const z = view.spp.toLocaleString('pt-BR', { maximumFractionDigits: view.spp < 10 ? 2 : 0 });
      infoEl.innerHTML = `<span>Início <b>${f(start)}</b></span><span>Fim <b>${f(end)}</b></span><span>Duração <b>${f(end - start)}</b></span><span>Zoom <b>${z} amostras/px</b></span>`;
    }
  }

  function snap(s) {
    if (!snapEl || !snapEl.checked) return s;
    const c = state.audio.channels[0], n = c.length, R = 2048;
    for (let d = 0; d < R; d++) for (const i of [s - d, s + d]) {
      if (i > 0 && i < n && (c[i - 1] <= 0) !== (c[i] <= 0)) return i;
    }
    return s;
  }

  function pickHandle(x) {
    const ds = Math.abs(x - xOf(state.edit.start)), de = Math.abs(x - xOf(state.edit.end));
    if (Math.min(ds, de) > HIT) return null;
    if (Math.abs(ds - de) < 4) return x < xOf(state.edit.start) ? 'start' : 'end';
    return ds < de ? 'start' : 'end';
  }

  function localX(e) { return e.clientX - canvas.getBoundingClientRect().left; }

  function pinchInfo() {
    const [a, b] = [...pointers.values()];
    return { dist: Math.max(1, Math.abs(a - b)), mid: (a + b) / 2 };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!state.audio) return;
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, localX(e));
    if (pointers.size === 2) {
      const p = pinchInfo();
      drag = { type: 'pinch', dist: p.dist, spp: view.spp, anchor: sOf(p.mid) };
    } else {
      const x = localX(e), h = pickHandle(x);
      drag = h ? { type: h } : { type: 'pan', x, offset: view.offset };
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !drag) return;
    const x = localX(e);
    pointers.set(e.pointerId, x);
    if (drag.type === 'pinch' && pointers.size >= 2) {
      const p = pinchInfo();
      view.spp = drag.spp * (drag.dist / p.dist);
      clampView();
      view.offset = drag.anchor - p.mid * view.spp; // mantém o ponto sob os dedos
      clampView();
    } else if (drag.type === 'pan') {
      view.offset = drag.offset - (x - drag.x) * view.spp; clampView();
    } else if (drag.type === 'start') {
      setEdit({ start: Math.max(0, Math.min(Math.round(sOf(x)), state.edit.end - MIN_SEL)) });
    } else if (drag.type === 'end') {
      setEdit({ end: Math.min(len(), Math.max(Math.round(sOf(x)), state.edit.start + MIN_SEL)) });
    }
    draw();
  });

  const release = (e) => {
    pointers.delete(e.pointerId);
    if (drag && (drag.type === 'start' || drag.type === 'end')) {
      if (drag.type === 'start') setEdit({ start: Math.max(0, Math.min(snap(state.edit.start), state.edit.end - MIN_SEL)) });
      else setEdit({ end: Math.min(len(), Math.max(snap(state.edit.end), state.edit.start + MIN_SEL)) });
    }
    if (drag && (drag.type === 'start' || drag.type === 'end') && onCommit) onCommit();
    if (pointers.size === 0) drag = null;
    else if (pointers.size === 1) { const [x] = pointers.values(); drag = { type: 'pan', x, offset: view.offset }; }
    draw();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  canvas.addEventListener('wheel', (e) => {
    if (!state.audio) return;
    e.preventDefault();
    const x = localX(e), anchor = sOf(x);
    view.spp *= Math.exp(e.deltaY * 0.0015);
    clampView(); view.offset = anchor - x * view.spp; clampView(); draw();
  }, { passive: false });

  function zoomBy(f) { const c = sOf(W / 2); view.spp *= f; clampView(); view.offset = c - (W / 2) * view.spp; clampView(); draw(); }
  function zoomAll() { view.spp = maxSpp(); view.offset = 0; clampView(); draw(); }
  function zoomSelection() {
    const span = Math.max(MIN_SEL, state.edit.end - state.edit.start);
    view.spp = span / (W * 0.9); clampView(); view.offset = state.edit.start - W * 0.05 * view.spp; clampView(); draw();
  }
  // enquadra rapidamente um handle (zoom de precisão)
  function zoomTo(sample, spp) { view.spp = spp; clampView(); view.offset = sample - (W / 2) * view.spp; clampView(); draw(); }

  on((kind) => {
    if (kind === 'audio') { peaks = buildPeaks(state.audio.channels); proc = null; resize(); zoomAll(); }
    else draw();
  });
  // Recebe o áudio editado da seleção para desenhar a forma de onda resultante.
  function setProcessed(rendered, start) {
    proc = { channels: rendered.channels, peaks: buildPeaks(rendered.channels), start, len: rendered.channels[0].length };
    draw();
  }
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(canvas);

  return { draw, zoomBy, zoomAll, zoomSelection, zoomTo, setProcessed };
}
