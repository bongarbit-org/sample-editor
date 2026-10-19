// Marcação do editor (forma de onda + reprodução + edição + exportação). Os ids são escopados ao elemento raiz.
export const EDITOR_TEMPLATE = `
<!-- Forma de onda + reprodução + edição num só bloco, para caber numa tela de celular -->
<section class="panel stage" aria-label="Forma de onda, reprodução e edição">
  <canvas id="wave"></canvas>
  <div class="timebox">
    <label class="tfield">Início <input id="tstart" type="text" inputmode="decimal" autocomplete="off" aria-label="Início em segundos" /><span>s</span></label>
    <label class="tfield">Fim <input id="tend" type="text" inputmode="decimal" autocomplete="off" aria-label="Fim em segundos" /><span>s</span></label>
  </div>
  <p class="readout"><span id="sel"></span><span id="zoomv"></span><span id="outdur"></span></p>
  <div class="row tight zoomrow">
    <button id="zin" class="btn sm">Zoom +</button>
    <button id="zout" class="btn sm">Zoom -</button>
    <button id="zall" class="btn sm">Tudo</button>
    <button id="zsel" class="btn sm">Seleção</button>
  </div>
  <div class="row tight">
    <button id="play" class="btn sm primary">Tocar</button>
    <button id="stop" class="btn sm">Parar</button>
    <label class="chk"><input id="loop" type="checkbox" /> Loop</label>
    <span id="peak" class="tag push"></span>
  </div>
  <div class="grid2">
    <div class="field"><label for="fi">Fade in <output id="fiv">0 ms</output></label><input id="fi" type="range" min="0" max="2000" step="1" value="0" /></div>
    <div class="field"><label for="fo">Fade out <output id="fov">0 ms</output></label><input id="fo" type="range" min="0" max="2000" step="1" value="0" /></div>
    <div class="field"><label for="gain">Ganho <output id="gv">0,0 dB</output></label><input id="gain" type="range" min="-24" max="24" step="0.1" value="0" /></div>
    <div class="field"><label for="speed">Veloc. <output id="spv">+0,0 st</output></label><input id="speed" type="range" min="-24" max="24" step="0.1" value="0" /></div>
  </div>
  <div class="row tight checks">
    <label class="chk"><input id="rev" type="checkbox" /> Inverter</label>
    <label class="chk"><input id="norm" type="checkbox" /> Normalizar</label>
    <label class="chk"><input id="snap" type="checkbox" checked /> Snap</label>
  </div>
  <div class="row tight">
    <button id="undo" class="btn sm" disabled>Desfazer</button>
    <button id="redo" class="btn sm" disabled>Refazer</button>
    <button id="helpBtn" class="btn sm ghost push" aria-expanded="false">Ajuda</button>
  </div>
  <div id="helpBox" class="help" hidden>
    <p class="note">Arraste os marcadores para recortar e o fundo para rolar. Dois dedos fazem zoom. Snap zero encaixa o marcador no cruzamento por zero. Normalizar leva o pico a −0,1 dBFS. Velocidade altera tom e duração juntos, em semitons (st). Dois toques num slider voltam ao padrão. Desfazer: Ctrl/Cmd+Z; refazer: Ctrl/Cmd+Shift+Z.</p>
    <p id="lat" class="note"></p>
  </div>
</section>

<section class="panel export-panel">
  <h2 class="panel-title">Exportar WAV</h2>
  <div class="field"><label for="chan">Canais</label><select id="chan"><option value="mono" selected>Mono</option><option value="stereo">Estéreo</option></select></div>
  <div class="field"><label for="rate">Taxa de amostragem</label><select id="rate">
    <option value="8000">8 kHz</option><option value="11025">11,025 kHz</option><option value="16000">16 kHz</option><option value="22050">22,05 kHz</option>
    <option value="32000">32 kHz</option><option value="44100" selected>44,1 kHz</option><option value="48000">48 kHz</option><option value="88200">88,2 kHz</option><option value="96000">96 kHz</option></select></div>
  <div class="field"><label for="bits">Resolução</label><select id="bits"><option value="8">8 bits</option><option value="16" selected>16 bits</option><option value="24">24 bits</option></select></div>
  <div class="field"><label for="dither">Dither</label><select id="dither"><option value="on" selected>Ligado</option><option value="off">Desligado</option></select></div>
  <div class="field">
    <label>Comparar (mesma posição)</label>
    <div class="row tight">
      <button id="abA" class="btn sm">Editado</button>
      <button id="abB" class="btn sm">Exportado</button>
      <button id="abStop" class="btn sm">Parar</button>
    </div>
    <p id="abNote" class="note"></p>
  </div>
  <div class="field"><label for="fname">Nome do arquivo</label><input id="fname" type="text" autocomplete="off" /></div>
  <div class="row">
    <button id="share" class="btn primary" hidden>Compartilhar</button>
    <button id="download" class="btn">Baixar</button>
    <button id="saveas" class="btn" hidden>Salvar em…</button>
  </div>
  <div class="field"><label for="slots">Samples na memória ao mesmo tempo</label><input id="slots" type="number" inputmode="numeric" min="1" max="16" step="1" value="3" /></div>
  <div id="profileBox" class="profile-box" hidden><span id="profileTag" class="tag"></span><p id="profileInfo" class="note"></p></div>
  <p id="profileNotes" class="note"></p>
  <p id="exportMsg" class="note"></p>
</section>
`;
