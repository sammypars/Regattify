import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the repo root of `main` at /Regattify/.
// The build writes index.html + assets/ to the repo root.
export default defineConfig({
  plugins: [react()],
  base: '/Regattify/',
  build: { outDir: '../', emptyOutDir: false, assetsDir: 'assets' },
});
