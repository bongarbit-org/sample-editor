import { createEditor } from '../editor/index.js';

const $ = (id) => document.getElementById(id);
const info = $('info');
const nf = (v, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

window.addEventListener('error', (ev) => { info.textContent = 'Erro JS: ' + ev.message; });
window.addEventListener('unhandledrejection', (ev) => { info.textContent = 'Erro: ' + (ev.reason && ev.reason.message || ev.reason); });

const editor = createEditor($('editor'));

$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  if (!file) return;
  info.textContent = `Lendo ${file.name} (${file.type || 'tipo desconhecido'}, ${(file.size / 1e6).toFixed(1)} MB)…`;
  try {
    const audio = await editor.loadFile(file, (t) => { info.textContent = t; });
    const dur = nf(audio.channels[0].length / audio.sampleRate, 2);
    info.textContent = `${file.name} · ${dur} s · ${audio.sampleRate.toLocaleString('pt-BR')} Hz · ${audio.channels.length} canal(is)`;
  } catch (e) {
    info.textContent = `Falha ao decodificar ${file.name} [${file.type || '?'}]: ${e && (e.name + ' ' + e.message) || e}`;
    console.error(e);
  }
});
