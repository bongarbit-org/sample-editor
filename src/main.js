import { decodeFile } from './audio/decode.js';
import { state, setAudio, setEdit, on } from './state.js';
import { renderEdit, peak, linToDb, toMono, toStereo, speedRatio } from './audio/process.js';
import { encodeWav } from './audio/wav.js';
import { resample } from './audio/resample.js';
import { Voice, makeBuffer, unlockOnFirstGesture, latencyMs } from './audio/player.js';
import { createWaveform } from './ui/waveform.js';

const $ = (id) => document.getElementById(id);
const info = $('info');

window.addEventListener('error', (ev) => { info.textContent = 'Erro JS: ' + ev.message; });
window.addEventListener('unhandledrejection', (ev) => { info.textContent = 'Erro: ' + (ev.reason && ev.reason.message || ev.reason); });
unlockOnFirstGesture();

// ---- render cacheado: o preview toca o resultado da edição ----
let rendered = null, abuf = null, dirty = true;
function getRendered() {
  if (dirty && state.audio) { rendered = renderEdit(state.audio, state.edit); abuf = null; dirty = false; updatePeak(); }
  return rendered;
}
function getBuffer() { getRendered(); if (!abuf) abuf = makeBuffer(rendered); return abuf; }
const nf = (v, d = 1) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
function updatePeak() {
  const p = peak(rendered.channels), db = linToDb(p), el = $('peak');
  el.textContent = p > 1 ? `Clipping ${nf(db)} dBFS` : isFinite(db) ? `${nf(db)} dBFS` : '−∞ dBFS';
  el.className = 'tag' + (p > 1 ? ' error' : db > -1 ? ' warn' : '');
  $('outdur').textContent = `Duração de saída: ${nf(rendered.channels[0].length / rendered.sampleRate, 3)} s`;
}

// ---- waveform ----
const preview = new Voice();
// Aplica a edição à imagem da forma de onda (ao soltar slider/marcador) e pré-monta o buffer de áudio.
function commit() {
  if (!state.audio) return;
  wave.setProcessed(getRendered(), state.edit.start);
  getBuffer(); // pré-aquecido: o próximo "Tocar" não paga o custo de montar o buffer
  if (preview.playing && $('loop').checked) preview.swap(getBuffer());
  scheduleExport();
}
const wave = createWaveform($('wave'), {
  getPlayhead() {
    const pos = preview.position();
    if (pos == null || !rendered) return null;
    const off = pos * rendered.sampleRate, len = rendered.channels[0].length; // reverse: o cursor anda da direita para a esquerda
    return state.edit.start + (state.edit.reverse ? len - off : off);
  },
  snapEl: $('snap'),
  infoEl: $('sel'),
  onCommit: commit,
});
(function tick() { if (preview.playing) wave.draw(); requestAnimationFrame(tick); })();

$('zin').onclick = () => wave.zoomBy(0.5);
$('zout').onclick = () => wave.zoomBy(2);
$('zall').onclick = () => wave.zoomAll();
$('zsel').onclick = () => wave.zoomSelection();

// ---- transporte: dispara em pointerdown (o "click" em toque espera o fim do gesto) ----
function play() { if (state.audio) { preview.start(getBuffer(), { loop: $('loop').checked }); showLatency(); } }
function showLatency() {
  const ms = latencyMs();
  $('lat').textContent = ms == null ? '' : `Latência de saída estimada: ~${ms} ms. Fones Bluetooth somam 100 a 250 ms.`;
}
$('play').addEventListener('pointerdown', (e) => { e.preventDefault(); play(); });
$('play').addEventListener('click', (e) => { if (e.detail === 0) play(); }); // teclado/acessibilidade
$('stop').addEventListener('pointerdown', (e) => { e.preventDefault(); preview.stop(); });
$('stop').addEventListener('click', (e) => { if (e.detail === 0) preview.stop(); });
$('loop').onchange = () => { if (preview.playing) preview.start(getBuffer(), { loop: $('loop').checked }); };

// ---- controles de edição ----
// input: atualiza o número e, se estiver em loop, troca o áudio em tempo real.
// change (ao soltar): redesenha a forma de onda com a edição aplicada.
let liveQueued = false;
function live() {
  if (liveQueued || !(preview.playing && $('loop').checked)) return;
  liveQueued = true;
  requestAnimationFrame(() => { liveQueued = false; if (preview.playing) { dirty = true; preview.swap(getBuffer()); } });
}
const fmtSpeed = (v) => `${v > 0 ? '+' : ''}${nf(v)} st · ×${nf(speedRatio(v), 2)}`;
const SLIDERS = [
  ['fi', 'fiv', 'fadeInMs', (v) => `${v} ms`, 0],
  ['fo', 'fov', 'fadeOutMs', (v) => `${v} ms`, 0],
  ['gain', 'gv', 'gainDb', (v) => `${nf(v)} dB`, 0],
  ['speed', 'spv', 'speedSt', fmtSpeed, 0],
];
for (const [id, outId, key, fmt, def] of SLIDERS) {
  const el = $(id);
  el.addEventListener('input', () => { const v = Number(el.value); $(outId).textContent = fmt(v); setEdit({ [key]: v }); live(); });
  el.addEventListener('change', commit);
  // duplo toque/clique: volta ao padrão
  let lastTap = 0, reset = false;
  el.addEventListener('pointerdown', () => { const t = performance.now(); reset = t - lastTap < 350; lastTap = t; });
  el.addEventListener('pointerup', () => {
    if (!reset) return;
    reset = false; lastTap = 0;
    el.value = def; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change'));
  });
}
$('norm').onchange = () => { setEdit({ normalize: $('norm').checked }); live(); commit(); };
$('rev').onchange = () => { setEdit({ reverse: $('rev').checked }); live(); commit(); };

// ---- exportação ----
const msg = (t) => { $('exportMsg').textContent = t; };
const fileName = () => ($('fname').value.trim() || 'sample').replace(/\.wav$/i, '') + '.wav';

async function buildWav() {
  const mono = $('chan').value === 'mono', rate = Number($('rate').value), bits = Number($('bits').value);
  const r = getRendered();
  let ch = mono ? toMono(r.channels) : toStereo(r.channels);
  ch = await resample(ch, r.sampleRate, rate);
  return new File([encodeWav(ch, rate, bits, bits < 24)], fileName(), { type: 'audio/wav' });
}
// O WAV é gerado em segundo plano após cada edição, para que "Compartilhar"/"Salvar" rodem
// dentro do gesto do usuário (navegadores móveis exigem isso) sem esperar o processamento.
let exportPromise = null, exportTimer = 0;
function getExport() {
  if (!exportPromise) exportPromise = buildWav().catch((e) => { exportPromise = null; throw e; });
  return exportPromise;
}
function scheduleExport() {
  exportPromise = null; clearTimeout(exportTimer);
  exportTimer = setTimeout(() => { if (state.audio) getExport().catch(() => {}); }, 400);
}
for (const id of ['chan', 'rate', 'bits']) $(id).onchange = scheduleExport;
$('fname').oninput = scheduleExport;

$('download').onclick = async () => {
  try {
    const f = await getExport();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    msg(`Gerado ${f.name} (${Math.round(f.size / 1024).toLocaleString('pt-BR')} KB).`);
  } catch (e) { msg('Erro ao exportar: ' + e.message); }
};

// Compartilhar só existe em contexto seguro (HTTPS). Em http://IP o navegador pode expor canShare sem share.
const canShareFiles = () =>
  window.isSecureContext && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' &&
  navigator.canShare({ files: [new File([''], 'a.wav', { type: 'audio/wav' })] });
if (canShareFiles()) $('share').hidden = false;
else msg('Compartilhar exige HTTPS (conexão segura); nesta URL só "Baixar" está disponível.');
$('share').onclick = async () => {
  try { const f = await getExport(); await navigator.share({ files: [f], title: f.name }); }
  catch (e) { if (e.name !== 'AbortError') msg(`Erro ao compartilhar: ${e.name} ${e.message}`); }
};

// "Salvar em…": o seletor é aberto primeiro (precisa do gesto do usuário); o arquivo é escrito depois.
if (window.isSecureContext && typeof window.showSaveFilePicker === 'function') {
  $('saveas').hidden = false;
  $('saveas').onclick = async () => {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: fileName(), types: [{ description: 'WAV', accept: { 'audio/wav': ['.wav'] } }] });
      const f = await getExport();
      const w = await h.createWritable(); await w.write(f); await w.close(); msg('Arquivo salvo.');
    } catch (e) { if (e.name !== 'AbortError') msg(`Erro ao salvar: ${e.name} ${e.message}`); }
  };
}

// ---- carregar arquivo ----
on((kind) => {
  dirty = true;
  if (kind !== 'audio') return;
  $('editor').hidden = false;
  for (const [id, out, txt] of [['fi', 'fiv', '0 ms'], ['fo', 'fov', '0 ms'], ['gain', 'gv', '0,0 dB'], ['speed', 'spv', '+0,0 st · ×1,00']]) { $(id).value = 0; $(out).textContent = txt; }
  $('norm').checked = false; $('rev').checked = false;
  $('fname').value = state.name.replace(/\.[^.]+$/, '');
  preview.stop();
  commit();
});

$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  if (!file) return;
  info.textContent = `Lendo ${file.name} (${file.type || 'tipo desconhecido'}, ${(file.size / 1e6).toFixed(1)} MB)…`;
  try {
    const audio = await decodeFile(file, (t) => { info.textContent = t; });
    setAudio(audio, file.name);
    const dur = nf(audio.channels[0].length / audio.sampleRate, 2);
    info.textContent = `${file.name} · ${dur} s · ${audio.sampleRate.toLocaleString('pt-BR')} Hz · ${audio.channels.length} canal(is)`;
  } catch (e) {
    info.textContent = `Falha ao decodificar ${file.name} [${file.type || '?'}]: ${e && (e.name + ' ' + e.message) || e}`;
    console.error(e);
  }
});
