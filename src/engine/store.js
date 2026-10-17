// Estado de uma sessão de edição, com pub/sub. `edit` é não destrutivo: o áudio original nunca é alterado.
// Cada editor cria o seu próprio store, então vários editores (ou testes) não compartilham estado.
export const defaultEdit = (length = 0) => ({
  start: 0, end: length, fadeInMs: 0, fadeOutMs: 0, gainDb: 0, normalize: false, speedSt: 0, reverse: false,
});

export function createStore() {
  const listeners = new Set();
  const state = { audio: null, name: '', edit: defaultEdit() };
  const emit = (kind) => listeners.forEach((fn) => fn(kind));
  return {
    state,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setAudio(audio, name) {
      state.audio = audio;
      state.name = name;
      state.edit = defaultEdit(audio.channels[0].length);
      emit('audio');
    },
    setEdit(patch) {
      Object.assign(state.edit, patch);
      emit('edit');
    },
  };
}
