import { defineConfig } from '@playwright/test';

/**
 * Electron end-to-end. Playwright drives the real packaged-mode main process,
 * so these are the only tests that prove the renderer/preload/main/SQLite
 * chain actually connects — everything below the IPC line is covered by the
 * vitest suites instead.
 */
export default defineConfig({
  testDir: './apps/desktop/e2e',
  // One real app instance, one SQLite file, one global hotkey: parallel
  // workers would fight over all three.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : [['list']],
});
