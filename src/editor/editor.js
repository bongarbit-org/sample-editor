import { decodeFile } from '../engine/decode.js';
import { createStore } from '../engine/store.js';
import { createHistory } from '../engine/history.js';
import { parseTime, boundFromTime } from '../engine/time.js';
import { PROFILES, resolveProfile, estimate } from '../engine/profile.js';
import { renderEdit, peak, linToDb, toMono, toStereo, speedRatio } from '../engine/process.js';
import { encodeWav, quantizeToFloat } from '../engine/wav.js';
import { resample } from '../engine/resample.js';
import { Voice, makeBuffer, unlockOnFirstGesture, latencyMs } from '../engine/player.js';
import { createWaveform } from './waveform.js';
import { EDITOR_TEMPLATE } from './template.js';

/**
 * Editor de áudio reutilizável. Monta a interface dentro de `root` e fica oculto até haver áudio.
 * opts.showExport (padrão true): mostra o painel de exportação WAV.
 * opts.profile: id ou objeto de perfil de exportação; o padrão é o M16 / ESP32-S3 e não há seletor na interface.
 * Retorna: { store, loadFile(file, onStatus), loadAudio(audio, name), getRendered(), exportWav(), on(fn), destroy() }.
 */
export function createEditor(root, opts = {}) {
  root.classList.add('editor-root');
  root.hidden = true;
  root.innerHTML = EDITOR_TEMPLATE;
  const $ = (id) => root.querySelector('#' + id);
  if (opts.showExport === false) root.querySelector('.export-panel').hidden = true;
  const store = createStore();
  const { state, setAudio, setEdit, on } = store;
  const history = createHistory({ limit: opts.historyLimit || 100 });
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
    $('outdur').textContent = `Saída ${nf(rendered.channels[0].length / rendered.sampleRate, 3)} s · ×${nf(speedRatio(state.edit.speedSt), 2)}`;
  }

  // ---- waveform ----
  const preview = new Voice();
  // Aplica a edição à imagem da forma de onda (ao soltar slider/marcador) e pré-monta o buffer de áudio.
  // Descreve o buffer em reprodução para continuar do MESMO ponto da seleção após qualquer edição.
  // O cursor sempre anda da esquerda para a direita; com "Inverter" a linha do tempo inteira é espelhada.
  let playMeta = null, playKey = ''; // playKey: edição do buffer em reprodução (evita trocas repetidas)
  const metaOf = (r) => ({ start: state.edit.start, len: r.channels[0].length, rate: r.sampleRate, reverse: state.edit.reverse });
  function liveSwap() {
    if (!preview.playing || ab === 'b' || !playMeta) return; // B (formato exportado) não acompanha edições
    const key = JSON.stringify(state.edit);
    if (key === playKey) return;
    playKey = key;
    let x = playMeta.start + preview.position() * playMeta.rate; // posição do cursor, em amostras da linha do tempo exibida
    if (playMeta.reverse !== state.edit.reverse) x = state.audio.channels[0].length - x; // reverse alternado: mesmo material no espelho
    dirty = true;
    const r = getRendered(), buf = getBuffer();
    let noff = x - state.edit.start;
    if (noff < 0 || noff >= r.channels[0].length) {
      if (!preview.loop) { preview.stop(); ab = null; return; } // saiu da seleção e não há loop
      noff = 0;
    }
    playMeta = metaOf(r);
    preview.swap(buf, noff / r.sampleRate);
  }

  function commit() {
    if (!state.audio) return;
    history.record(state.edit); // ao soltar slider/marcador: uma entrada por gesto
    updateHistoryButtons();
    getRendered(); updateProfileInfo();
    wave.setProcessed(getRendered(), state.edit.start);
    getBuffer(); // pré-aquecido: o próximo "Tocar" não paga o custo de montar o buffer
    liveSwap();
    scheduleExport();
  }
  const wave = createWaveform($('wave'), {
    store,
    getPlayhead() {
      const pos = preview.position();
      if (pos == null || !rendered) return null;
      return state.edit.start + pos * rendered.sampleRate; // sempre da esquerda para a direita, com ou sem "Inverter"
    },
    snapEl: $('snap'),
    infoEl: $('sel'),
    zoomEl: $('zoomv'),
    onCommit: commit,
  });
  let raf = 0;
  (function tick() {
    const on = preview.playing;
    if (on) wave.draw();
    $('abA').classList.toggle('on', on && ab === 'a');
    $('abB').classList.toggle('on', on && ab === 'b');
    raf = requestAnimationFrame(tick);
  })();

  $('zin').onclick = () => wave.zoomBy(0.5);
  $('zout').onclick = () => wave.zoomBy(2);
  $('zall').onclick = () => wave.zoomAll();
  $('zsel').onclick = () => wave.zoomSelection();

  // ---- transporte: dispara em pointerdown (o "click" em toque espera o fim do gesto) ----
  function play() { if (state.audio) { ab = 'a'; preview.start(getBuffer(), { loop: $('loop').checked }); playMeta = metaOf(getRendered()); playKey = JSON.stringify(state.edit); showLatency(); } }
  function showLatency() {
    const ms = latencyMs();
    $('lat').textContent = ms == null ? '' : `Latência de saída estimada: ~${ms} ms. Fones Bluetooth somam 100 a 250 ms.`;
  }
  $('play').addEventListener('pointerdown', (e) => { e.preventDefault(); play(); });
  $('play').addEventListener('click', (e) => { if (e.detail === 0) play(); }); // teclado/acessibilidade
  $('stop').addEventListener('pointerdown', (e) => { e.preventDefault(); preview.stop(); ab = null; });
  $('stop').addEventListener('click', (e) => { if (e.detail === 0) preview.stop(); });
  $('loop').onchange = () => { if (preview.playing) preview.start(getBuffer(), { loop: $('loop').checked }); };

  // ---- controles de edição ----
  // input: atualiza o número e, se estiver em loop, troca o áudio em tempo real.
  // change (ao soltar): redesenha a forma de onda com a edição aplicada.
  let liveQueued = false;
  function live() {
    if (liveQueued || !preview.playing) return;
    liveQueued = true;
    requestAnimationFrame(() => { liveQueued = false; liveSwap(); });
  }
  const fmtSpeed = (v) => `${v > 0 ? '+' : ''}${nf(v)} st`;
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
  // Reflete state.edit nos controles (usado ao carregar áudio e em desfazer/refazer).
  function syncControls() {
    for (const [id, outId, key, fmt] of SLIDERS) { $(id).value = state.edit[key]; $(outId).textContent = fmt(state.edit[key]); }
    $('norm').checked = state.edit.normalize; $('rev').checked = state.edit.reverse;
  }
  function updateHistoryButtons() { $('undo').disabled = !history.canUndo; $('redo').disabled = !history.canRedo; }
  function travel(snapshot) {
    if (!snapshot || !state.audio) return;
    setEdit(snapshot); syncControls(); commit();
  }
  const undo = () => travel(history.undo());
  const redo = () => travel(history.redo());
  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('helpBtn').onclick = () => { const box = $('helpBox'); box.hidden = !box.hidden; $('helpBtn').setAttribute('aria-expanded', String(!box.hidden)); };
  const onKey = (e) => {
    if (root.hidden || !(e.metaKey || e.ctrlKey) || e.altKey) return;
    const t = e.target, typing = t && (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && t.type === 'text'));
    if (typing) return;
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); (e.shiftKey ? redo : undo)(); }
    else if (k === 'y') { e.preventDefault(); redo(); }
  };
  document.addEventListener('keydown', onKey);

  $('norm').onchange = () => { setEdit({ normalize: $('norm').checked }); live(); commit(); };
  // Alternar o reverse espelha a linha do tempo: início/fim passam para o espelho, e o trecho escolhido continua o mesmo.
  $('rev').onchange = () => {
    const N = state.audio.channels[0].length, e = state.edit;
    setEdit({ reverse: $('rev').checked, start: N - e.end, end: N - e.start });
    live(); commit();
  };

  // ---- exportação ----
  const msg = (t) => { $('exportMsg').textContent = t; };
  const fileName = () => ($('fname').value.trim() || 'sample').replace(/\.wav$/i, '') + '.wav';

  // Dados exportados (canais já reamostrados) são calculados uma vez e servem ao arquivo e à prévia B.
  async function buildExportData() {
    const mono = $('chan').value === 'mono', rate = Number($('rate').value), bits = Number($('bits').value);
    const dither = $('dither').value === 'on' && bits < 24;
    const r = getRendered();
    const ch = await resample(mono ? toMono(r.channels) : toStereo(r.channels), r.sampleRate, rate);
    return { ch, rate, bits, dither, mono };
  }
  async function buildWav() {
    const d = await getExportData();
    return new File([encodeWav(d.ch, d.rate, d.bits, d.dither)], fileName(), { type: 'audio/wav' });
  }
  // O WAV é gerado em segundo plano após cada edição, para que "Compartilhar"/"Salvar" rodem
  // dentro do gesto do usuário (navegadores móveis exigem isso) sem esperar o processamento.
  let exportPromise = null, dataPromise = null, exportTimer = 0;
  function getExportData() {
    if (!dataPromise) dataPromise = buildExportData().catch((e) => { dataPromise = null; throw e; });
    return dataPromise;
  }
  function getExport() {
    if (!exportPromise) exportPromise = buildWav().catch((e) => { exportPromise = null; throw e; });
    return exportPromise;
  }
  function scheduleExport() {
    exportPromise = dataPromise = null; clearTimeout(exportTimer);
    exportTimer = setTimeout(() => { if (state.audio) getExport().catch(() => {}); }, 400);
  }
  // 8 bits: dither desligado por padrão (o chiado é audível); 16 bits: ligado; 24 bits: não se aplica.
  function syncDither() {
    const bits = Number($('bits').value);
    $('dither').disabled = bits === 24;
    if (bits === 24) $('dither').value = 'off'; else $('dither').value = bits === 8 ? 'off' : 'on';
  }
  $('bits').addEventListener('change', syncDither);
  syncDither();
  for (const id of ['chan', 'rate', 'bits', 'dither']) $(id).addEventListener('change', scheduleExport);

  // ---- limites do M16 / ESP32-S3: sempre ativos (sem seletor de perfil) ----
  // O formato fica restrito ao que o instrumento aceita e a análise de memória considera que este sample
  // divide a PSRAM com outros (campo "Samples na memória ao mesmo tempo").
  const profile = resolveProfile(opts.profile) || PROFILES['m16-sampler'];
  const MiB = 1024 * 1024;
  const fmtBytes = (b) => (b >= MiB ? `${nf(b / MiB, 2)} MiB` : `${nf(b / 1024, 1)} KiB`);
  const int = (v) => Math.round(v).toLocaleString('pt-BR');
  (function restrictFormat() {
    const allowed = { chan: profile.channels.map(String), rate: profile.rates.map(String), bits: profile.bits.map(String) };
    for (const id of ['chan', 'rate', 'bits']) {
      const sel = $(id);
      [...sel.options].forEach((o) => { if (!allowed[id].includes(o.value)) o.remove(); });
    }
    $('chan').value = profile.preferredChannels; $('rate').value = String(profile.preferredRate); $('bits').value = String(profile.preferredBits);
    $('slots').value = String(profile.residentSlots);
    syncDither();
  })();
  const slotsValue = () => Math.max(1, Math.min(16, Math.round(Number($('slots').value)) || profile.residentSlots));
  function profileEstimate() {
    if (!rendered) return null;
    const rate = Number($('rate').value), channels = $('chan').value === 'mono' ? 1 : 2;
    const frames = Math.round((rendered.channels[0].length / rendered.sampleRate) * rate);
    return { p: profile, e: estimate(profile, { frames, rate, channels, bits: Number($('bits').value), slots: slotsValue() }) };
  }
  function updateProfileInfo() {
    const r = profileEstimate(), box = $('profileBox');
    box.hidden = !r;
    if (!r) return;
    const { e } = r;
    $('profileTag').textContent = e.status === 'error' ? 'Excede o limite' : e.status === 'warn' ? 'Perto do limite' : 'Dentro do limite';
    $('profileTag').className = 'tag' + (e.status === 'error' ? ' error' : e.status === 'warn' ? ' warn' : '');
    $('profileInfo').innerHTML = [
      `Este sample: RAM ${fmtBytes(e.ramBytes)} (${nf(e.fractionOfTotal * 100, 1)}% da PSRAM utilizável de ${fmtBytes(e.totalBudgetBytes)}) · arquivo ${fmtBytes(e.fileBytes)}`,
      `Com ${e.slots} samples na memória: limite de ${fmtBytes(e.budgetBytes)} por sample (usa ${nf(e.fraction * 100, 1)}%) · máx. ${nf(e.maxSeconds, 1)} s neste formato`,
      `Cabem ~${int(e.fitRam)} samples assim na PSRAM e ~${int(e.fitFlash)} na flash interna (${fmtBytes(profile.storageBytes)})`,
      ...e.issues,
    ].map((t) => `<span>${t}</span>`).join('');
  }
  $('slots').addEventListener('input', updateProfileInfo);
  for (const id of ['chan', 'rate', 'bits']) $(id).addEventListener('change', updateProfileInfo);

  // ---- início e fim digitados (segundos, na linha do tempo exibida) ----
  const fmtT = (smp) => nf(smp / state.audio.sampleRate, 4);
  const TIME_FIELDS = [['tstart', 'start'], ['tend', 'end']];
  function updateTimeInputs() { // não sobrescreve o campo enquanto o usuário digita
    if (!state.audio) return;
    for (const [id, key] of TIME_FIELDS) if (document.activeElement !== $(id)) $(id).value = fmtT(state.edit[key]);
  }
  function applyTime(id, key) {
    const el = $(id), t = parseTime(el.value);
    if (!state.audio || !Number.isFinite(t)) { updateTimeInputs(); el.value = state.audio ? fmtT(state.edit[key]) : ''; return; }
    setEdit({ [key]: boundFromTime(key, t, state.audio.sampleRate, state.edit, state.audio.channels[0].length) });
    el.value = fmtT(state.edit[key]);
    commit();
  }
  for (const [id, key] of TIME_FIELDS) {
    const el = $(id);
    el.addEventListener('change', () => applyTime(id, key));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); return; }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault(); // ↑/↓ ajustam 1 ms; Shift 10 ms; Alt 100 ms
      const step = (e.altKey ? 0.1 : e.shiftKey ? 0.01 : 0.001) * (e.key === 'ArrowUp' ? 1 : -1);
      const cur = parseTime(el.value);
      el.value = nf((Number.isFinite(cur) ? cur : state.edit[key] / state.audio.sampleRate) + step, 4);
      applyTime(id, key);
    });
  }

  // ---- comparar: editado (A) x formato exportado (B), tocando da mesma posição ----
  let ab = null;
  const fmtHz = (hz) => `${nf(hz / 1000, hz % 1000 ? 3 : 1).replace(/,?0+$/, '')} kHz`;
  async function playAB(which) {
    if (!state.audio) return;
    const loop = $('loop').checked;
    const frac = preview.playing ? preview.position() / preview.duration : 0;
    let buffer;
    if (which === 'a') { buffer = getBuffer(); playMeta = metaOf(getRendered()); playKey = JSON.stringify(state.edit); }
    else {
      $('abNote').textContent = 'Preparando o formato exportado…';
      try {
        const d = await getExportData();
        buffer = makeBuffer({ channels: quantizeToFloat(d.ch, d.bits, d.dither), sampleRate: d.rate });
        $('abNote').textContent = `Exportado: ${d.mono ? 'mono' : 'estéreo'} · ${fmtHz(d.rate)} · ${d.bits} bits · dither ${d.dither ? 'ligado' : 'desligado'}.`;
      } catch (e) { $('abNote').textContent = 'Erro ao preparar: ' + e.message; return; }
    }
    ab = which;
    if (which === 'b') playMeta = null;
    preview.start(buffer, { loop, offset: Math.min(buffer.duration - 0.001, frac * buffer.duration), fadeInMs: 5 });
  }
  const press = (id, fn) => { // pointerdown: dispara sem esperar o fim do toque; click só para teclado
    $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
    $(id).addEventListener('click', (e) => { if (e.detail === 0) fn(); });
  };
  press('abA', () => playAB('a'));
  press('abB', () => playAB('b'));
  press('abStop', () => { preview.stop(); ab = null; });
  $('fname').oninput = scheduleExport;

  $('download').onclick = async () => {
    try {
      const f = await getExport();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      const pe = profileEstimate();
      msg(`Gerado ${f.name} (${Math.round(f.size / 1024).toLocaleString('pt-BR')} KB).` + (pe && pe.e.status === 'error' ? ' Atenção: excede o limite do perfil e será truncado no instrumento.' : ''));
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
    updateTimeInputs();
    if (kind !== 'audio') return;
    root.hidden = false;
    syncControls(); updateTimeInputs();
    $('fname').value = state.name.replace(/\.[^.]+$/, '');
    history.reset(state.edit);
    preview.stop();
    commit();
  });

  async function loadFile(file, onStatus) {
    const audio = await decodeFile(file, onStatus);
    setAudio(audio, file.name);
    return audio;
  }

  return {
    store,
    loadFile,
    loadAudio: (audio, name) => setAudio(audio, name),
    getRendered,
    getProfile: () => profile,
    getProfileEstimate: () => { const r = profileEstimate(); return r && r.e; },
    undo, redo,
    get history() { return { canUndo: history.canUndo, canRedo: history.canRedo, size: history.size }; },
    exportWav: getExport, // Promise<File> no formato escolhido no painel
    on: store.on,
    destroy() {
      document.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); clearTimeout(exportTimer); preview.stop(); wave.destroy(); root.innerHTML = '';
    },
  };
}
