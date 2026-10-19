import { describe, it, expect } from 'vitest';
import { applyFades, applyGain, normalize, peak, renderEdit, toMono, resampleLinear, speedRatio } from './process.js';
import { encodeWav, quantize, quantizeToFloat } from './wav.js';
import { createStore, defaultEdit } from './store.js';
import { createHistory } from './history.js';
import { PROFILES, resolveProfile, estimate } from './profile.js';

const ones = (n) => [new Float32Array(n).fill(1)];

describe('process', () => {
  it('fade in/out vai a zero nas pontas', () => {
    const [c] = applyFades(ones(1000), 1000, 100, 100);
    expect(c[0]).toBe(0); expect(c[999]).toBe(0); expect(c[500]).toBe(1);
  });
  it('ganho de +6 dB ≈ x2', () => { expect(applyGain(ones(2), 6.0206)[0][0]).toBeCloseTo(2, 3); });
  it('normaliza o pico a -0.1 dBFS', () => {
    const c = [new Float32Array([0.1, -0.25, 0.2])];
    expect(peak(normalize(c))).toBeCloseTo(Math.pow(10, -0.1 / 20), 5);
  });
  it('recorta e mixa para mono', () => {
    const audio = { channels: [new Float32Array([0, 1, 1, 0]), new Float32Array([0, 0, 1, 0])], sampleRate: 44100 };
    const r = renderEdit(audio, { start: 1, end: 3, fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false });
    expect(r.channels[0].length).toBe(2);
    expect(Array.from(toMono(r.channels)[0])).toEqual([0.5, 1]);
  });
});

describe('reverse: o que se vê é o que se recorta (propriedade)', () => {
  it('para qualquer início/fim, o resultado é a fatia da linha do tempo exibida', () => {
    const N = 64, src = Float32Array.from({ length: N }, (_, i) => i + 1);
    const audio = { channels: [src], sampleRate: 44100 };
    let seed = 7; const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let k = 0; k < 300; k++) {
      const start = rnd(N - 1), end = start + 1 + rnd(N - start - 1 || 1), reverse = rnd(2) === 1;
      const e = { start, end: Math.min(end, N), fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false, speedSt: 0, reverse };
      const shown = reverse ? Array.from(src).reverse() : Array.from(src); // linha do tempo exibida
      expect(Array.from(renderEdit(audio, e).channels[0])).toEqual(shown.slice(e.start, e.end));
    }
  });
  it('espelhar início/fim ao alternar o reverse nunca muda o trecho de áudio escolhido', () => {
    const N = 50, src = Float32Array.from({ length: N }, (_, i) => i + 1), audio = { channels: [src], sampleRate: 44100 };
    const base = { fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false, speedSt: 0 };
    for (let start = 0; start < N; start += 7) for (let end = start + 1; end <= N; end += 5) {
      const a = Array.from(renderEdit(audio, { ...base, start, end, reverse: false }).channels[0]);
      const b = Array.from(renderEdit(audio, { ...base, start: N - end, end: N - start, reverse: true }).channels[0]);
      expect(b).toEqual(a.slice().reverse());
    }
  });
});

describe('velocidade e reverse', () => {
  const audio = { channels: [new Float32Array([1, 2, 3, 4])], sampleRate: 44100 };
  const base = { start: 0, end: 4, fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false, speedSt: 0, reverse: false };
  it('reverse inverte a seleção sem alterar o original', () => {
    const r = renderEdit(audio, { ...base, reverse: true });
    expect(Array.from(r.channels[0])).toEqual([4, 3, 2, 1]);
    expect(Array.from(audio.channels[0])).toEqual([1, 2, 3, 4]);
  });
  it('com reverse, início/fim valem na linha do tempo espelhada (recorta o que se vê)', () => {
    const a = { channels: [new Float32Array([1, 2, 3, 4, 5, 6])], sampleRate: 44100 };
    const r = renderEdit(a, { ...base, start: 1, end: 3, reverse: true }); // espelhado: [6,5,4,3,2,1] -> fatia [1,3)
    expect(Array.from(r.channels[0])).toEqual([5, 4]);
  });
  it('espelhar início/fim ao alternar o reverse mantém o mesmo trecho (invertido)', () => {
    const a = { channels: [Float32Array.from({ length: 10 }, (_, i) => i + 1)], sampleRate: 44100 }, N = 10;
    const fwd = renderEdit(a, { ...base, start: 2, end: 7, reverse: false }).channels[0];
    const rev = renderEdit(a, { ...base, start: N - 7, end: N - 2, reverse: true }).channels[0];
    expect(Array.from(rev)).toEqual(Array.from(fwd).reverse());
  });
  it('+12 semitons dobra a taxa declarada e mantém as amostras', () => {
    const r = renderEdit(audio, { ...base, speedSt: 12 });
    expect(r.sampleRate).toBeCloseTo(88200, 3); expect(r.channels[0].length).toBe(4);
    expect(speedRatio(-12)).toBeCloseTo(0.5, 6);
  });
  it('resampleLinear interpola e muda o comprimento', () => {
    const o = resampleLinear(new Float32Array([0, 1]), 1, 2);
    expect(o.length).toBe(4); expect(o[1]).toBeCloseTo(0.5, 6);
  });
});

describe('quantização', () => {
  it('8 bits tem 255 níveis e volta ao float arredondado', () => {
    const f = quantizeToFloat([new Float32Array([0, 0.5, -1, 2])], 8, false)[0];
    [0, 64 / 127, -1, 1].forEach((v, i) => expect(f[i]).toBeCloseTo(v, 6));
  });
  it('sem dither é determinístico; com dither a média do erro é ~0', () => {
    expect(quantize(0.3, 16, false)).toBe(quantize(0.3, 16, false));
    let err = 0; const N = 20000;
    for (let i = 0; i < N; i++) err += quantize(0.3, 8, true) / 127 - 0.3;
    expect(Math.abs(err / N)).toBeLessThan(0.002);
  });
  it('24 bits ignora dither', () => { expect(quantize(0.3, 24, true)).toBe(quantize(0.3, 24, false)); });
});

describe('wav', () => {
  it('escreve cabeçalho 44.1k/16/estéreo correto', () => {
    const buf = encodeWav([new Float32Array([0, 1]), new Float32Array([-1, 0])], 44100, 16);
    const v = new DataView(buf);
    expect(buf.byteLength).toBe(44 + 8);
    expect(String.fromCharCode(v.getUint8(0), v.getUint8(8))).toBe('RW');
    expect(v.getUint16(22, true)).toBe(2); expect(v.getUint32(24, true)).toBe(44100); expect(v.getUint16(34, true)).toBe(16);
    expect(v.getInt16(44 + 2, true)).toBe(-32768);
    expect(v.getInt16(44 + 4, true)).toBe(32767);
  });
  it('clipa valores fora de ±1 e suporta 24-bit', () => {
    const v = new DataView(encodeWav([new Float32Array([2])], 48000, 24));
    expect(v.getUint8(44) | (v.getUint8(45) << 8) | (v.getUint8(46) << 16)).toBe(0x7fffff);
  });
});

describe('store', () => {
  it('setAudio zera a edição para a duração do áudio e avisa os ouvintes', () => {
    const store = createStore(); const kinds = [];
    store.on((k) => kinds.push(k));
    store.setAudio({ channels: [new Float32Array(1000)], sampleRate: 44100 }, 'a.wav');
    expect(store.state.edit).toEqual(defaultEdit(1000));
    store.setEdit({ gainDb: 3 });
    expect(store.state.edit.gainDb).toBe(3);
    expect(kinds).toEqual(['audio', 'edit']);
  });
  it('stores são independentes e on() devolve o cancelamento', () => {
    const a = createStore(), b = createStore(); let n = 0;
    const off = a.on(() => n++);
    a.setEdit({ start: 5 }); off(); a.setEdit({ start: 6 });
    expect(n).toBe(1); expect(b.state.edit.start).toBe(0);
  });
});

describe('engine sem DOM', () => {
  it('a API pública carrega em Node e expõe o necessário', async () => {
    const engine = await import('./index.js');
    for (const k of ['createStore', 'renderEdit', 'encodeWav', 'quantizeToFloat', 'resample', 'decodeFile', 'Voice']) expect(typeof engine[k]).toBe('function');
  });
});

describe('histórico', () => {
  const e = (o = {}) => ({ ...defaultEdit(100), ...o });
  it('desfaz e refaz em ordem', () => {
    const h = createHistory(); h.reset(e());
    h.record(e({ gainDb: 3 })); h.record(e({ gainDb: 6 }));
    expect(h.undo().gainDb).toBe(3); expect(h.undo().gainDb).toBe(0); expect(h.undo()).toBeNull();
    expect(h.redo().gainDb).toBe(3); expect(h.redo().gainDb).toBe(6); expect(h.redo()).toBeNull();
  });
  it('ignora estados iguais e descarta o refazer após nova edição', () => {
    const h = createHistory(); h.reset(e());
    expect(h.record(e())).toBe(false);
    h.record(e({ gainDb: 3 })); h.undo();
    expect(h.canRedo).toBe(true);
    h.record(e({ reverse: true }));
    expect(h.canRedo).toBe(false); expect(h.size).toBe(2);
  });
  it('respeita o limite de profundidade', () => {
    const h = createHistory({ limit: 3 }); h.reset(e());
    for (let g = 1; g <= 5; g++) h.record(e({ gainDb: g }));
    expect(h.size).toBe(3);
    expect(h.undo().gainDb).toBe(4); expect(h.undo().gainDb).toBe(3); expect(h.undo()).toBeNull();
  });
  it('snapshots são cópias: mutar o original não altera o histórico', () => {
    const h = createHistory(); const ed = e(); h.reset(ed);
    ed.gainDb = 9; h.record(ed); h.undo();
    expect(h.redo().gainDb).toBe(9);
    ed.gainDb = 0; expect(h.undo().gainDb).toBe(0);
  });
});

describe('análise com vários samples na memória', () => {
  const m16 = PROFILES['m16-sampler'];
  const one = { frames: 44100, rate: 44100, channels: 1, bits: 16 };
  it('o orçamento por sample divide a PSRAM utilizável pelos samples simultâneos', () => {
    const a = estimate(m16, { ...one, slots: 3 }), b = estimate(m16, { ...one, slots: 9 });
    expect(a.totalBudgetBytes).toBe(b.totalBudgetBytes);
    expect(b.budgetBytes).toBeCloseTo(a.budgetBytes / 3, -2);
    expect(a.slots).toBe(3); expect(estimate(m16, one).slots).toBe(3);
  });
  it('9 samples simultâneos baixam o limite para ~9,5 s e fazem 15 s excederem', () => {
    const e = estimate(m16, { ...one, slots: 9 });
    expect(e.maxSeconds).toBeCloseTo(9.5, 1); expect(e.status).toBe('ok');
    expect(estimate(m16, { ...one, frames: 44100 * 15, slots: 9 }).status).toBe('error');
    expect(estimate(m16, { ...one, frames: 44100 * 15, slots: 3 }).status).toBe('ok');
  });
  it('informa a fração do total e quantos samples assim cabem na PSRAM e na flash', () => {
    const e = estimate(m16, one);
    expect(e.fractionOfTotal).toBeCloseTo(88200 / 7549747, 6);
    expect(e.fitRam).toBe(85); expect(e.fitFlash).toBe(40);
  });
});

describe('perfil M16', () => {
  const m16 = PROFILES['m16-sampler'];
  it('resolve por id, objeto ou nulo', () => {
    expect(resolveProfile('m16-sampler')).toBe(m16); expect(resolveProfile('x')).toBeNull(); expect(resolveProfile(null)).toBeNull();
    expect(resolveProfile(m16)).toBe(m16);
  });
  it('1 s mono 44,1 kHz 16 bits custa 88.200 B de RAM e ~28,5 s cabem por sample', () => {
    const e = estimate(m16, { frames: 44100, rate: 44100, channels: 1, bits: 16 });
    expect(e.ramBytes).toBe(88200); expect(e.fileBytes).toBe(44 + 88200);
    expect(e.maxSeconds).toBeCloseTo(28.5, 1); expect(e.status).toBe('ok'); expect(e.issues).toEqual([]);
  });
  it('a RAM não depende dos bits do arquivo, mas o arquivo sim', () => {
    const a = estimate(m16, { frames: 1000, rate: 44100, channels: 1, bits: 8 }), b = estimate(m16, { frames: 1000, rate: 44100, channels: 1, bits: 16 });
    expect(a.ramBytes).toBe(b.ramBytes); expect(a.fileBytes).toBeLessThan(b.fileBytes);
  });
  it('avisa perto do limite e erra acima dele', () => {
    const cap = (s, ch = 1) => estimate(m16, { frames: Math.round(s * 44100), rate: 44100, channels: ch, bits: 16 });
    expect(cap(23).status).toBe('warn'); expect(cap(29).status).toBe('error'); expect(cap(15, 2).status).toBe('error');
  });
  it('taxa diferente de 44,1 kHz gera aviso informativo sem mudar o estado', () => {
    const e = estimate(m16, { frames: 22050, rate: 22050, channels: 1, bits: 16 });
    expect(e.status).toBe('ok'); expect(e.issues.length).toBe(1);
  });
});
