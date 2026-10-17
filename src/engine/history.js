// Histórico de estados de edição (desfazer/refazer). Guarda cópias de `edit`; o áudio original nunca muda.
// Mudanças contínuas (arrastar slider ou marcador) viram uma única entrada: quem chama só usa record() ao soltar.
export function createHistory({ limit = 100 } = {}) {
  let stack = [], i = -1;
  const snap = (e) => ({ ...e });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return {
    reset(edit) { stack = [snap(edit)]; i = 0; },
    // Registra o estado atual; ignora se for igual ao da posição atual. Descarta o "refazer" pendente.
    record(edit) {
      if (i >= 0 && same(stack[i], edit)) return false;
      stack = stack.slice(0, i + 1);
      stack.push(snap(edit));
      if (stack.length > limit) stack.shift();
      i = stack.length - 1;
      return true;
    },
    undo() { return i > 0 ? snap(stack[--i]) : null; },
    redo() { return i < stack.length - 1 ? snap(stack[++i]) : null; },
    get canUndo() { return i > 0; },
    get canRedo() { return i >= 0 && i < stack.length - 1; },
    get size() { return stack.length; },
  };
}
