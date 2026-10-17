// Perfis de exportação: restringem formato e avisam sobre o limite de memória do instrumento.
// Valores do perfil M16 vêm da auditoria (docs/audio-engine.md §3 e §7), conferidos no código da M16:
//  - Wav.h: aceita PCM/float 8-32 bits, mas guarda SEMPRE int16 na RAM (custo = taxa x canais x 2 B/s);
//  - M16.h: a saída é fixa em 44,1 kHz e Samp.h não interpola por padrão (outras taxas soam mais ásperas);
//  - Wav.h: arquivo maior que 90% da PSRAM livre é truncado em silêncio;
//  - main.cpp: só os 3 samples da página atual ficam na RAM.
// A PSRAM livre real NÃO foi medida (hipótese): o orçamento abaixo é conservador e deve ser calibrado em hardware.
const MiB = 1024 * 1024;

export const PROFILES = {
  'm16-sampler': {
    id: 'm16-sampler',
    label: 'M16 Sampler (ESP32-S3 N16R8)',
    rates: [8000, 11025, 16000, 22050, 32000, 44100, 48000],
    preferredRate: 44100,
    bits: [8, 16],
    preferredBits: 16,
    channels: ['mono', 'stereo'],
    preferredChannels: 'mono',
    ramBytesPerSample: 2, // int16 na RAM, qualquer que seja a resolução do arquivo
    memoryBytes: 8 * MiB, // PSRAM nominal
    usableFraction: 0.9, // a M16 só usa até 90% da PSRAM livre
    residentSlots: 3, // samples na RAM ao mesmo tempo (uma página de 3 botões)
    warnFraction: 0.75,
  },
};

export const resolveProfile = (p) => (typeof p === 'string' ? PROFILES[p] || null : p || null);

// Estima o custo de um sample exportado e classifica contra o orçamento do perfil.
export function estimate(profile, { frames, rate, channels, bits }) {
  const ramBytes = frames * channels * profile.ramBytesPerSample;
  const budgetBytes = Math.floor((profile.memoryBytes * profile.usableFraction) / profile.residentSlots);
  const fraction = ramBytes / budgetBytes;
  const issues = [];
  let status = 'ok';
  if (fraction > 1) {
    status = 'error';
    issues.push('Excede o limite por sample: a M16 trunca o arquivo em silêncio.');
  } else if (fraction > profile.warnFraction) {
    status = 'warn';
    issues.push('Perto do limite de memória por sample.');
  }
  if (rate !== profile.preferredRate) {
    issues.push('A M16 toca em 44,1 kHz sem interpolação: outras taxas economizam memória, mas soam mais ásperas.');
  }
  return {
    ramBytes, budgetBytes, fraction, status, issues,
    fileBytes: 44 + Math.ceil((frames * channels * bits) / 8),
    maxSeconds: budgetBytes / (rate * channels * profile.ramBytesPerSample),
  };
}
