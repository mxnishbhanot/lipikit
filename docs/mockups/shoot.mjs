/**
 * Renders docs/mockups/screens.html to PNGs, once per theme.
 *
 * Not a Playwright *test*: nothing here asserts, and putting it in the e2e
 * project would mean `pnpm test:e2e` starts Electron to take screenshots.
 * Run it with `node docs/mockups/shoot.mjs`.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'screenshots');
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
// 2x so the PNGs stay sharp on a README opened on a retina display.
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1400, height: 1000 } });
await page.goto(`file://${join(here, 'screens.html')}`);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);

for (const theme of ['light', 'dark']) {
  await page.evaluate((mode) => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
  for (const shot of await page.locator('.shot').all()) {
    const name = await shot.getAttribute('data-name');
    await shot.screenshot({ path: join(out, `${name}-${theme}.png`) });
    console.log(`${name}-${theme}.png`);
  }
}

await browser.close();
