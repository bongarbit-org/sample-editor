// Encoder WAV PCM (8/16/24-bit). 8-bit é unsigned, 16/24 são signed little-endian.
export function encodeWav(channels, sampleRate, bits = 16, dither = false) {
  const nCh = channels.length;
  const n = channels[0].length;
  const bytes = bits / 8;
  const dataLen = n * nCh * bytes;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nCh * bytes, true);
  v.setUint16(32, nCh * bytes, true); v.setUint16(34, bits, true);
  str(36, 'data'); v.setUint32(40, dataLen, true);

  const max = Math.pow(2, bits - 1);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < nCh; c++) {
      let x = channels[c][i];
      if (dither && bits < 24) x += (Math.random() - Math.random()) / max; // TPDF ±1 LSB
      x = Math.max(-1, Math.min(1, x));
      if (bits === 8) v.setUint8(o, Math.round(x * 127) + 128);
      else if (bits === 16) v.setInt16(o, Math.round(x < 0 ? x * 32768 : x * 32767), true);
      else {
        const s = Math.round(x < 0 ? x * 8388608 : x * 8388607);
        v.setUint8(o, s & 0xff); v.setUint8(o + 1, (s >> 8) & 0xff); v.setUint8(o + 2, (s >> 16) & 0xff);
      }
      o += bytes;
    }
  }
  return buf;
}
