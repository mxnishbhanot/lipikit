import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

const APP_DIR = join(__dirname, '..');

let app: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [
      APP_DIR,
      // A throwaway profile per run: the suite must never read or write the
      // developer's real settings, history or clipboard log.
      `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ai-anywhere-e2e-'))}`,
    ],
    // Unpackaged + NODE_ENV=development would send the window at the Vite dev
    // server; production makes it load the built renderer from out/.
    env: { ...process.env, NODE_ENV: 'production', AI_ANYWHERE_LOG_LEVEL: 'error' },
  });
  window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await app.close();
});

test('renders the shell and answers app.getInfo over the preload bridge', async () => {
  await expect(window.locator('h1')).toHaveText('AI Anywhere');
  // The subtitle is main-process data, so a version here proves the IPC
  // bridge round-trips — not merely that the bundle rendered.
  await expect(window.locator('header p')).toHaveText(/^v\d+\.\d+\.\d+ · (linux|win32)$/);
});

test('settings load from SQLite and a change survives a renderer reload', async () => {
  await window.getByRole('button', { name: 'settings' }).click();

  // General is the default page; its values come from the settings table, so
  // reaching them means migrations ran and the repository answered.
  const streaming = window.getByRole('checkbox', { name: 'Stream responses' });
  await expect(streaming).toBeVisible();
  const before = await streaming.isChecked();

  await streaming.click();
  await expect(streaming).toBeChecked({ checked: !before });

  // A reload throws away every renderer cache, so what comes back is what the
  // main process actually wrote to disk.
  await window.reload();
  await window.getByRole('button', { name: 'settings' }).click();
  await expect(window.getByRole('checkbox', { name: 'Stream responses' })).toBeChecked({
    checked: !before,
  });
});
