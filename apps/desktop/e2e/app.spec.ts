import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { BRANDING } from '@ai-anywhere/shared';

const APP_DIR = join(__dirname, '..');

let app: ElectronApplication;
let window: Page;

/**
 * The settings window, chosen by its route rather than by arrival order.
 * `firstWindow()` is a coin flip here: the popup is prewarmed a tick after the
 * main window, both load the same file:// document and differ only in the
 * fragment, so whichever attaches first wins — and a run that picks the popup
 * fails every assertion below for the wrong reason.
 */
async function mainWindow(instance: ElectronApplication): Promise<Page> {
  const isMain = (page: Page): boolean => page.url().endsWith('#/');
  await expect.poll(() => instance.windows().some(isMain), { timeout: 20_000 }).toBe(true);
  const page = instance.windows().find(isMain);
  if (!page) throw new Error('the main window disappeared while it was being selected');
  return page;
}

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
  window = await mainWindow(app);
  await window.waitForLoadState('domcontentloaded');
  // A throwaway profile is a first run, so the onboarding wizard owns the
  // window until it is dismissed. Skipping writes `onboardingCompleted`
  // through the same mutation the wizard's last step uses, which is what the
  // shell tests below need — and what a returning user's profile already has.
  const skipOnboarding = window.getByRole('button', { name: 'Skip setup' });
  await skipOnboarding.click();
  await expect(skipOnboarding).toBeHidden();
});

test.afterAll(async () => {
  await app.close();
});

test('renders the shell and answers app.getInfo over the preload bridge', async () => {
  await expect(window.locator('h1')).toHaveText(BRANDING.appName);
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
