import { describe, it, expect } from 'vitest';
import { applyFades, applyGain, normalize, peak, renderEdit, toMono, resampleLinear, speedRatio } from './process.js';
import { encodeWav, quantize, quantizeToFloat } from './wav.js';

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

describe('velocidade e reverse', () => {
  const audio = { channels: [new Float32Array([1, 2, 3, 4])], sampleRate: 44100 };
  const base = { start: 0, end: 4, fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false, speedSt: 0, reverse: false };
  it('reverse inverte a seleção sem alterar o original', () => {
    const r = renderEdit(audio, { ...base, reverse: true });
    expect(Array.from(r.channels[0])).toEqual([4, 3, 2, 1]);
    expect(Array.from(audio.channels[0])).toEqual([1, 2, 3, 4]);
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
