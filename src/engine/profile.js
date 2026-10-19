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
    residentSlots: 3, // padrão: samples na RAM ao mesmo tempo (uma página de 3 botões); o editor deixa ajustar
    storageBytes: 3538944, // partição de dados (spiffs) de default_16MB.csv; hipótese: o firmware pode usar SD ou outra partição
    warnFraction: 0.75,
  },
};

export const resolveProfile = (p) => (typeof p === 'string' ? PROFILES[p] || null : p || null);

// Estima o custo de um sample exportado e o classifica contra o orçamento do perfil.
// Esse sample NÃO é o único no instrumento: o orçamento por sample divide a PSRAM utilizável entre `slots`
// samples residentes ao mesmo tempo (padrão do perfil; ajustável). Também informa quantos samples assim cabem.
export function estimate(profile, { frames, rate, channels, bits, slots = profile.residentSlots }) {
  const ramBytes = frames * channels * profile.ramBytesPerSample;
  const totalBudgetBytes = Math.floor(profile.memoryBytes * profile.usableFraction);
  const budgetBytes = Math.floor(totalBudgetBytes / slots);
  const fraction = ramBytes / budgetBytes;
  const fileBytes = 44 + Math.ceil((frames * channels * bits) / 8);
  const issues = [];
  let status = 'ok';
  if (fraction > 1) {
    status = 'error';
    issues.push(`Excede o limite por sample com ${slots} samples na memória: a M16 trunca o arquivo em silêncio.`);
  } else if (fraction > profile.warnFraction) {
    status = 'warn';
    issues.push('Perto do limite de memória por sample.');
  }
  if (rate !== profile.preferredRate) {
    issues.push('A M16 toca em 44,1 kHz sem interpolação: outras taxas economizam memória, mas soam mais ásperas.');
  }
  return {
    ramBytes, budgetBytes, totalBudgetBytes, fraction, status, issues, fileBytes, slots,
    fractionOfTotal: ramBytes / totalBudgetBytes,
    maxSeconds: budgetBytes / (rate * channels * profile.ramBytesPerSample),
    fitRam: ramBytes > 0 ? Math.floor(totalBudgetBytes / ramBytes) : 0, // samples deste tamanho que cabem na PSRAM
    fitFlash: profile.storageBytes && fileBytes > 0 ? Math.floor(profile.storageBytes / fileBytes) : 0, // ... na flash interna
  };
}
