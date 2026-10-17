// Decodifica um File em { channels: Float32Array[], sampleRate }.
// 1º tenta o decodificador nativo do navegador; se falhar (vídeo, formato exótico), usa ffmpeg.wasm.
async function decodeArrayBuffer(data) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('Web Audio API indisponível neste navegador');
  const ctx = new Ctx();
  try {
    // Forma com callbacks: compatível com Safari antigo, que não retorna Promise.
    const buf = await new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(data, resolve, reject);
      if (p && p.catch) p.catch(reject);
    });
    const channels = [];
    for (let c = 0; c < buf.numberOfChannels; c++) channels.push(buf.getChannelData(c).slice());
    return { channels, sampleRate: buf.sampleRate };
  } finally {
    ctx.close();
  }
}

export async function decodeFile(file, onStatus = () => {}) {
  try {
    return await decodeArrayBuffer(await file.arrayBuffer());
  } catch (nativeErr) {
    console.warn('Decodificação nativa falhou, usando ffmpeg.wasm:', nativeErr);
    const { extractAudioWav } = await import('./ffmpeg.js'); // carrega só quando necessário
    return decodeArrayBuffer(await extractAudioWav(file, onStatus));
  }
}
