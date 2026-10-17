// Mostra o contrato do editor como pacote: createEditor(root, opções) -> { loadFile, loadAudio, exportWav, ... }.
import { createEditor } from '../../src/editor/index.js';

const editor = createEditor(document.getElementById('editor'), { showExport: false });
window.editor = editor; // facilita testes e experimentos no console

document.getElementById('file').addEventListener('change', (e) => e.target.files[0] && editor.loadFile(e.target.files[0]));
document.getElementById('send').addEventListener('click', async () => {
  const wav = await editor.exportWav(); // File com o formato escolhido (padrão: mono, 44,1 kHz, 16 bits)
  document.getElementById('result').textContent = `${wav.name}: ${wav.size} bytes`;
});
