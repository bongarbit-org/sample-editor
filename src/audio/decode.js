// Decodifica um File em { channels: Float32Array[], sampleRate }.
// Fallback ffmpeg.wasm para formatos não suportados entra na Fase 7.
export async function decodeFile(file) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('Web Audio API indisponível neste navegador');
  const data = await file.arrayBuffer();
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
