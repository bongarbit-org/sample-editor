// Fallback: extrai a faixa de áudio de qualquer arquivo (vídeo ou formato que o navegador não lê)
// usando ffmpeg.wasm (single-thread: não exige SharedArrayBuffer/COOP/COEP).
// O núcleo (~31 MB) só é baixado na primeira necessidade e fica no Cache Storage.
import { FFmpeg } from '@ffmpeg/ffmpeg';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

const CACHE = 'ffmpeg-core-v1';
let ffmpeg = null, loading = null;

async function fetchCached(url, mime, onProgress) {
  const cache = window.caches ? await caches.open(CACHE) : null;
  let res = cache ? await cache.match(url) : null;
  if (!res) {
    res = await fetch(url);
    if (!res.ok) throw new Error(`Falha ao baixar ${url} (${res.status})`);
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader(), parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); got += value.length;
      onProgress && onProgress(total ? got / total : 0, got);
    }
    const blob = new Blob(parts, { type: mime });
    if (cache) await cache.put(url, new Response(blob, { headers: { 'content-type': mime } })).catch(() => {});
    return URL.createObjectURL(blob);
  }
  return URL.createObjectURL(await res.blob());
}

async function getFFmpeg(onStatus) {
  if (ffmpeg) return ffmpeg;
  if (!loading) {
    loading = (async () => {
      const ff = new FFmpeg();
      const note = (what) => (r, got) => onStatus(`Baixando decodificador de vídeo (${what})… ${r ? Math.round(r * 100) + '%' : (got / 1e6).toFixed(0) + ' MB'}`);
      onStatus('Preparando decodificador de vídeo…');
      const [core, wasm] = await Promise.all([
        fetchCached(coreURL, 'text/javascript', note('script')),
        fetchCached(wasmURL, 'application/wasm', note('~31 MB, só na primeira vez')),
      ]);
      await ff.load({ coreURL: core, wasmURL: wasm });
      ffmpeg = ff;
      return ff;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

// Retorna um ArrayBuffer com um WAV PCM float32 (taxa e canais originais), que o navegador decodifica nativamente.
export async function extractAudioWav(file, onStatus = () => {}) {
  const ff = await getFFmpeg(onStatus);
  const onProgress = ({ progress }) => {
    if (progress > 0 && progress <= 1) onStatus(`Extraindo áudio de ${file.name}… ${Math.round(progress * 100)}%`);
  };
  ff.on('progress', onProgress);
  onStatus(`Extraindo áudio de ${file.name}…`);
  const dir = '/work', out = 'out.wav';
  let input;
  try {
    // WORKERFS lê o arquivo sob demanda, sem copiá-lo inteiro para a memória do wasm.
    try {
      await ff.createDir(dir);
      await ff.mount('WORKERFS', { files: [file] }, dir);
      input = `${dir}/${file.name}`;
    } catch (_) {
      input = 'input' + (file.name.match(/\.[A-Za-z0-9]+$/) || [''])[0];
      await ff.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    }
    const code = await ff.exec(['-i', input, '-vn', '-map', '0:a:0', '-c:a', 'pcm_f32le', '-f', 'wav', out]);
    if (code !== 0) throw new Error('Nenhuma faixa de áudio encontrada neste arquivo');
    const data = await ff.readFile(out);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } finally {
    ff.off('progress', onProgress);
    try { await ff.deleteFile(out); } catch (_) {}
    try { await ff.unmount(dir); await ff.deleteDir(dir); } catch (_) {}
    if (!input || !input.startsWith(dir)) { try { await ff.deleteFile(input); } catch (_) {} }
  }
}
