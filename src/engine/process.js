// Funções puras de edição. Todas operam sobre Float32Array[] (um por canal).
export const dbToLin = (db) => Math.pow(10, db / 20);
export const linToDb = (lin) => (lin > 0 ? 20 * Math.log10(lin) : -Infinity);

export function sliceChannels(channels, start, end) {
  return channels.map((ch) => ch.slice(start, end));
}

export function peak(channels) {
  let p = 0;
  for (const ch of channels) for (let i = 0; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > p) p = a; }
  return p;
}

export function applyGain(channels, db) {
  if (!db) return channels;
  const g = dbToLin(db);
  for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= g;
  return channels;
}

export function normalize(channels, targetDb = -0.1) {
  const p = peak(channels);
  if (p === 0) return channels;
  return applyGain(channels, targetDb - linToDb(p));
}

export function applyFades(channels, sampleRate, fadeInMs, fadeOutMs) {
  for (const ch of channels) {
    const len = ch.length;
    const nIn = Math.min(len, Math.round((fadeInMs / 1000) * sampleRate));
    const nOut = Math.min(len, Math.round((fadeOutMs / 1000) * sampleRate));
    for (let i = 0; i < nIn; i++) ch[i] *= i / nIn;
    for (let i = 0; i < nOut; i++) ch[len - 1 - i] *= i / nOut;
  }
  return channels;
}

// Reamostragem linear simples (usada só como rede de segurança para taxas fora do que o navegador aceita).
export function resampleLinear(ch, from, to) {
  if (from === to) return ch;
  const n = Math.max(1, Math.round((ch.length * to) / from)), out = new Float32Array(n), k = from / to;
  for (let i = 0; i < n; i++) {
    const x = i * k, i0 = Math.floor(x), f = x - i0;
    out[i] = ch[Math.min(i0, ch.length - 1)] * (1 - f) + ch[Math.min(i0 + 1, ch.length - 1)] * f;
  }
  return out;
}

// Velocidade estilo sampler (varispeed): muda tom e duração juntos. Em vez de reamostrar, o áudio
// é apenas declarado numa taxa maior/menor (sampleRate * razão); quem toca ou exporta converte a taxa.
export const speedRatio = (semitones) => Math.pow(2, (semitones || 0) / 12);

// recorte -> reverse -> normalização (opcional) -> ganho -> fades (em ms de saída) -> velocidade (taxa)
export function renderEdit(audio, edit) {
  const len = audio.channels[0].length;
  const start = Math.max(0, Math.min(edit.start, len - 1));
  const end = Math.max(start + 1, Math.min(edit.end, len));
  const rate = audio.sampleRate * speedRatio(edit.speedSt);
  let ch = sliceChannels(audio.channels, start, end);
  if (edit.reverse) for (const c of ch) c.reverse();
  if (edit.normalize) normalize(ch);
  applyGain(ch, edit.gainDb);
  applyFades(ch, rate, edit.fadeInMs, edit.fadeOutMs);
  return { channels: ch, sampleRate: rate };
}

export function toMono(channels) {
  if (channels.length === 1) return channels;
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i] / channels.length;
  return [out];
}

export function toStereo(channels) {
  if (channels.length >= 2) return channels.slice(0, 2);
  return [channels[0], channels[0].slice()];
}
