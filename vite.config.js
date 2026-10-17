import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // caminhos relativos: funciona em bongarbit.github.io/sample-editor/
  // allowedHosts: permite abrir o dev server por um túnel HTTPS durante os testes
  server: { host: true, allowedHosts: true },
});
