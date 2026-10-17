// Reamostragem de alta qualidade via OfflineAudioContext.
export async function resample(channels, srcRate, dstRate) {
  if (srcRate === dstRate) return channels;
  const n = channels[0].length;
  const outLen = Math.max(1, Math.round((n * dstRate) / srcRate));
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const off = new Offline(channels.length, outLen, dstRate);
  const buf = off.createBuffer(channels.length, n, srcRate);
  channels.forEach((ch, i) => buf.copyToChannel(ch, i));
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return Array.from({ length: channels.length }, (_, i) => rendered.getChannelData(i).slice());
}
