import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * One config for two kinds of suite: pure logic in `packages/*` runs in node,
 * React components (`apps/desktop/src`, `packages/ui/src`) need a DOM. `environmentMatchGlobs`
 * keeps that a per-glob detail instead of a second config file.
 *
 * `packages/database` is excluded on purpose: better-sqlite3 is rebuilt for
 * Electron's ABI (`electron-builder install-app-deps`), so plain node cannot
 * `dlopen` it. That suite keeps its own `electron --test` runner.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['{packages,apps}/*/src/**/*.test.{ts,tsx}', 'apps/desktop/electron/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'packages/database/**'],
    environment: 'node',
    // `packages/ui` is the exception to "packages are pure logic": its
    // components are React, so they need the same DOM the renderer suites do.
    environmentMatchGlobs: [
      ['apps/desktop/src/**', 'jsdom'],
      ['packages/ui/src/**', 'jsdom'],
    ],
    restoreMocks: true,
  },
});
