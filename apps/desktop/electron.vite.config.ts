import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

/**
 * One config, three build targets. electron-vite exists precisely so the
 * main/preload/renderer triple isn't three hand-maintained Vite configs.
 */
const workspacePackages = [
  '@ai-anywhere/shared',
  '@ai-anywhere/ui',
  '@ai-anywhere/platform',
  '@ai-anywhere/providers',
  '@ai-anywhere/context-engine',
  '@ai-anywhere/database',
  '@ai-anywhere/prompts',
];

export default defineConfig({
  main: {
    // Workspace packages are bundled (they never ship to npm); node_modules
    // and native deps stay external so better-sqlite3 keeps its .node binary.
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
    build: { lib: { entry: resolve(__dirname, 'electron/main/index.ts') } },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
    build: { lib: { entry: resolve(__dirname, 'electron/preload/index.ts') } },
  },
  renderer: {
    root: resolve(__dirname, '.'),
    plugins: [react()],
    resolve: { alias: { '@': resolve(__dirname, 'src') } },
    build: { rollupOptions: { input: resolve(__dirname, 'index.html') } },
  },
});
