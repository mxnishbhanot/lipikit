import { app, BrowserWindow } from 'electron';
import { IPC_EVENTS, loadEnv } from '@ai-anywhere/shared';
import { HOTKEY_SERVICE } from '@ai-anywhere/platform';
import { SETTINGS_REPOSITORY } from '@ai-anywhere/database';
import { buildContainer } from './composition-root.js';
import { createIpcHandlers } from './ipc/handlers.js';
import { registerIpcHandlers } from './ipc/typed-ipc.js';
import { LOGGER, WINDOW_MANAGER } from './tokens.js';

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
      const accelerator = settings.value.globalHotkey;
      const registered = container.resolve(HOTKEY_SERVICE).register(accelerator, () => {
        windows.broadcast(IPC_EVENTS.hotkeyTriggered, { accelerator });
        windows.showOverlay();
      });
      if (!registered.ok)
        logger.warn('hotkey unavailable', { accelerator, reason: registered.error.message });
    }
  });

  // Windows and Linux both quit with the last window; the macOS "stay alive"
  // convention is deliberately absent since macOS is out of scope.
  app.on('window-all-closed', () => app.quit());

  app.on('will-quit', () => {
    disposeIpc?.();
    container.resolve(HOTKEY_SERVICE).unregisterAll();
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
