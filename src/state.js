// Estado global mínimo com pub/sub. `edit` é não destrutivo: o áudio original nunca é alterado.
const listeners = new Set();

export const state = {
  audio: null, // { channels: Float32Array[], sampleRate }
  name: '',
  edit: { start: 0, end: 0, fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false },
};

export function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(kind) { listeners.forEach((fn) => fn(kind)); }

export function setAudio(audio, name) {
  state.audio = audio;
  state.name = name;
  state.edit = { start: 0, end: audio.channels[0].length, fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false };
  emit('audio');
}

export function setEdit(patch) {
  Object.assign(state.edit, patch);
  emit('edit');
}
