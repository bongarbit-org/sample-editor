// API pública do motor de áudio (sem DOM). O ffmpeg.wasm é carregado sob demanda por `decodeFile`.
export { defaultEdit, createStore } from './store.js';
export { createHistory } from './history.js';
export { PROFILES, resolveProfile, estimate } from './profile.js';
export {
  dbToLin, linToDb, sliceChannels, peak, applyGain, normalize, applyFades,
  renderEdit, speedRatio, resampleLinear, toMono, toStereo,
} from './process.js';
export { quantize, quantizeToFloat, encodeWav } from './wav.js';
export { resample, toSafeRate } from './resample.js';
export { decodeFile } from './decode.js';
export { Voice, makeBuffer, getCtx, unlockOnFirstGesture, latencyMs } from './player.js';
