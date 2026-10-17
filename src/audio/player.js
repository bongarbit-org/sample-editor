// Preview compartilha um AudioContext (criado/desbloqueado no primeiro gesto do usuário).
let ctx = null;
export function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Acorda o áudio no primeiro toque (iOS/Android só liberam após um gesto) para o 1º play não ter atraso extra.
export function unlockOnFirstGesture() {
  const unlock = () => {
    const c = getCtx();
    const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, c.sampleRate);
    s.connect(c.destination); s.start();
    for (const ev of ['pointerdown', 'touchend', 'keydown']) window.removeEventListener(ev, unlock, true);
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, true);
}

// Latência estimada (ms): buffer interno do navegador + saída do dispositivo (se informado).
export function latencyMs() {
  if (!ctx) return null;
  return Math.round(((ctx.baseLatency || 0) + (ctx.outputLatency || 0)) * 1000);
}

export function makeBuffer(rendered) {
  const c = getCtx();
  const b = c.createBuffer(rendered.channels.length, rendered.channels[0].length, rendered.sampleRate);
  rendered.channels.forEach((ch, i) => b.copyToChannel(ch, i));
  return b;
}

export class Voice {
  constructor() { this.source = null; this.gain = null; this.startedAt = 0; this.duration = 0; this.loop = false; }
  start(buffer, { loop = false, level = 1, offset = 0, fadeInMs = 0, onEnd } = {}) {
    const c = getCtx();
    const src = c.createBufferSource();
    const g = c.createGain();
    src.buffer = buffer; src.loop = loop;
    if (fadeInMs) { g.gain.setValueAtTime(0, c.currentTime); g.gain.linearRampToValueAtTime(level, c.currentTime + fadeInMs / 1000); }
    else g.gain.value = level;
    src.connect(g).connect(c.destination);
    src.onended = () => { if (this.source === src) { this.source = null; onEnd && onEnd(); } };
    src.start(0, offset);
    this.stop();
    this.source = src; this.gain = g; this.startedAt = c.currentTime - offset; this.duration = buffer.duration; this.loop = loop;
  }
  // Troca o buffer de um loop em andamento mantendo a posição relativa (crossfade curto, sem clique).
  swap(buffer) {
    if (!this.source || !this.loop) return false;
    const pos = this.position() / this.duration;
    this.start(buffer, { loop: true, offset: Math.min(buffer.duration - 0.001, pos * buffer.duration), fadeInMs: 10 });
    return true;
  }
  stop(fadeMs = 8) {
    if (!this.source) return;
    const c = getCtx(), src = this.source, g = this.gain;
    this.source = null;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.linearRampToValueAtTime(0, c.currentTime + fadeMs / 1000); // evita clique
    try { src.stop(c.currentTime + fadeMs / 1000 + 0.01); } catch (_) {}
  }
  get playing() { return !!this.source; }
  // posição em segundos dentro do buffer
  position() {
    if (!this.source) return null;
    const t = getCtx().currentTime - this.startedAt;
    return this.loop ? t % this.duration : Math.min(t, this.duration);
  }
}
