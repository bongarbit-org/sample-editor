// Tempo digitado pelo usuário: aceita "1,5", "1.5", "1,5 s" e "m:ss,ms" (ex.: "0:01,5"). Retorna segundos ou NaN.
export function parseTime(str) {
  const s = String(str).trim().replace(/\s+/g, '').replace(/s$/i, '');
  if (!s) return NaN;
  const m = s.match(/^(\d+):(\d+(?:[.,]\d+)?)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2].replace(',', '.'));
  if (!/^-?(\d+[.,]?\d*|[.,]\d+)$/.test(s)) return NaN;
  return Number(s.replace(',', '.'));
}

// Converte o tempo digitado em amostra e respeita os limites: início < fim com no mínimo `minSel` amostras.
export function boundFromTime(key, seconds, sampleRate, edit, total, minSel = 16) {
  const smp = Math.round(seconds * sampleRate);
  return key === 'start' ? Math.max(0, Math.min(smp, edit.end - minSel)) : Math.min(total, Math.max(smp, edit.start + minSel));
}
