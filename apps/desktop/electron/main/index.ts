import { app, BrowserWindow, nativeTheme } from 'electron';
import { loadEnv } from '@lipikit/shared';
import { HOTKEY_SERVICE } from '@lipikit/platform';
import { HISTORY_REPOSITORY, PROMPT_REPOSITORY, SETTINGS_REPOSITORY } from '@lipikit/database';
import { buildContainer } from './composition-root.js';
import { createIpcHandlers } from './ipc/handlers.js';
import { registerIpcHandlers } from './ipc/typed-ipc.js';
import { bindGlobalHotkey, resetHotkeyBinding, syncPromptHotkeys } from './services/hotkey-binding.js';
import { notify } from './services/notify.js';
import { createTray, destroyTray } from './services/tray.js';
import { CLIPBOARD_MONITOR, LOGGER, SELECTION_FLOW, WINDOW_MANAGER } from './tokens.js';

// A packaged build never trusts an inherited NODE_ENV: it would try to load
// the renderer from a dev server that isn't there.
const envResult = loadEnv(app.isPackaged ? { ...process.env, NODE_ENV: 'production' } : process.env);
if (!envResult.ok) {
  // Bad configuration must not boot a half-working app.
  console.error(`Invalid environment: ${envResult.error.message}`);
  app.exit(1);
}
const env = envResult.ok ? envResult.value : null;

// Windows ties toasts to the AppUserModelID: without this they are attributed
// to "electron.app.Electron" in a dev run and dropped entirely in a packaged
// one, so every notification below depends on it. No-op on Linux.
app.setAppUserModelId('com.lipikit.app');

/**
 * Autostart launches with --hidden (see the autostart service): showing the
 * settings window in the user's face at every login is not what "launch at
 * login" means. The tray is still created, so the app is reachable.
 */
const startHidden = process.argv.includes('--hidden');

// Single-instance: a second launch focuses the existing window instead of
// racing over the same SQLite file and the same global hotkey.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else if (env) {
  const container = buildContainer(env);
  const logger = container.resolve(LOGGER);
  let disposeIpc: (() => void) | null = null;

  app.on('second-instance', () => container.resolve(WINDOW_MANAGER).showMain());

  // performance.now() is measured from process start, so this is the real
  // launch instant rather than the moment this line ran.
  const bootStartedAt = Date.now() - Math.round(performance.now());

  void app.whenReady().then(() => {
    try {
      disposeIpc = registerIpcHandlers(createIpcHandlers(container), logger);

      const windows = container.resolve(WINDOW_MANAGER);
      const settings = container.resolve(SETTINGS_REPOSITORY).get();
      if (settings.ok) {
        // The native title bar and the Windows caption buttons are drawn by the
        // OS, so the app's own theme has to be handed to it or a dark UI keeps a
        // light title bar. Also what `prefers-color-scheme` answers in the
        // renderer, which is how 'system' resolves there.
        nativeTheme.themeSource = settings.value.theme;
      }
      // Before the first window: the tray is what a hidden start and every
      // hide-instead-of-close depend on being there.
      createTray({
        windows,
        flow: container.resolve(SELECTION_FLOW),
        logger,
        hotkey: settings.ok ? settings.value.globalHotkey : '',
      });
      if (!startHidden) windows.showMain();
      logger.info('startup', { readyMs: Date.now() - bootStartedAt, hidden: startHidden });

      if (settings.ok) {
        const palette = bindGlobalHotkey(container, settings.value.globalHotkey, 'palette');
        if (!palette.ok) {
          // Logging this was not enough: the hotkey is the only way into the
          // popup, so a combination another app already owns has to be said out
          // loud — the tray menu is the fallback until it is changed.
          notify(
            `${settings.value.globalHotkey} is unavailable`,
            'Another app holds that shortcut. Use the tray menu, or pick a different one in Settings > Shortcuts.',
          );
        }
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
        // After the boot path, never on it: building the popup costs a renderer
        // load, and the point is to have paid it before the first hotkey press
        // rather than during one.
        setImmediate(() => windows.prewarmOverlay());
      } else {
        logger.error('settings unreadable; no hotkey bound', { reason: settings.error.message });
      }
    } catch (cause) {
      logger.error('BOOT THREW', { cause: String(cause), stack: (cause as Error).stack });
    }
  });

  // Windows and Linux both quit with the last window; the macOS "stay alive"
  // convention is deliberately absent since macOS is out of scope.
  app.on('window-all-closed', () => app.quit());

  app.on('will-quit', () => {
    disposeIpc?.();
    destroyTray();
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
