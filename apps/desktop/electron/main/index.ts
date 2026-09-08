import { app, BrowserWindow } from 'electron';
import { loadEnv } from '@ai-anywhere/shared';
import { HOTKEY_SERVICE } from '@ai-anywhere/platform';
import { HISTORY_REPOSITORY, PROMPT_REPOSITORY, SETTINGS_REPOSITORY } from '@ai-anywhere/database';
import { buildContainer } from './composition-root.js';
import { createIpcHandlers } from './ipc/handlers.js';
import { registerIpcHandlers } from './ipc/typed-ipc.js';
import { bindGlobalHotkey, resetHotkeyBinding, syncPromptHotkeys } from './services/hotkey-binding.js';
import { CLIPBOARD_MONITOR, LOGGER, WINDOW_MANAGER } from './tokens.js';

// A packaged build never trusts an inherited NODE_ENV: it would try to load
// the renderer from a dev server that isn't there.
const envResult = loadEnv(app.isPackaged ? { ...process.env, NODE_ENV: 'production' } : process.env);
if (!envResult.ok) {
  // Bad configuration must not boot a half-working app.
  console.error(`Invalid environment: ${envResult.error.message}`);
  app.exit(1);
}
const env = envResult.ok ? envResult.value : null;

// Single-instance: a second launch focuses the existing window instead of
// racing over the same SQLite file and the same global hotkey.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else if (env) {
  const container = buildContainer(env);
  const logger = container.resolve(LOGGER);
  let disposeIpc: (() => void) | null = null;

  app.on('second-instance', () => container.resolve(WINDOW_MANAGER).showMain());

  void app.whenReady().then(() => {
    disposeIpc = registerIpcHandlers(createIpcHandlers(container), logger);

    const windows = container.resolve(WINDOW_MANAGER);
    windows.showMain();

    const settings = container.resolve(SETTINGS_REPOSITORY).get();
    if (settings.ok) {
      bindGlobalHotkey(container, settings.value.globalHotkey, 'palette');
      bindGlobalHotkey(container, settings.value.clientReplyHotkey, 'client-reply');
      // Prompt shortcuts live on the prompt rows, so they are bound from the
      // list rather than from settings.
      const stored = container.resolve(PROMPT_REPOSITORY).list();
      if (stored.ok) syncPromptHotkeys(container, stored.value);
      // Retention is enforced at startup rather than on a timer: the app is
      // long-lived but the window the user cares about is "what is in the DB
      // now", and a sweep on boot is one query instead of a scheduler.
      const cutoff = Date.now() - settings.value.historyRetentionDays * 24 * 60 * 60 * 1_000;
      const purged = container.resolve(HISTORY_REPOSITORY).purgeOlderThan(cutoff);
      if (purged.ok && purged.value > 0) logger.info('history purged', { rows: purged.value });
      container.resolve(CLIPBOARD_MONITOR).sync();
    } else {
      logger.error('settings unreadable; no hotkey bound', { reason: settings.error.message });
    }
  });

  // Windows and Linux both quit with the last window; the macOS "stay alive"
  // convention is deliberately absent since macOS is out of scope.
  app.on('window-all-closed', () => app.quit());

  app.on('will-quit', () => {
    disposeIpc?.();
    container.resolve(CLIPBOARD_MONITOR).stop();
    container.resolve(HOTKEY_SERVICE).unregisterAll();
    resetHotkeyBinding();
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => event.preventDefault());
  });

  process.on('uncaughtException', (error) => {
    logger.error('uncaught exception', { error: error.message });
    BrowserWindow.getAllWindows().forEach((w) => w.destroy());
    app.exit(1);
  });
}
