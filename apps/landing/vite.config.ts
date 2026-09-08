import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * A static site: no server, no API, no env at runtime. `base` is relative so
 * the same `dist/` works on a project-scoped GitHub Pages URL and on a domain
 * root without a rebuild.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true },
});
