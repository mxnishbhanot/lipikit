import { join } from 'node:path';
import { app, Menu, Tray, nativeImage } from 'electron';
import { BRANDING, type Logger } from '@lipikit/shared';
import type { WindowManager } from '../windows/window-manager.js';
import type { SelectionFlow } from './selection-flow.js';

export interface TrayDeps {
  readonly windows: WindowManager;
  readonly flow: SelectionFlow;
  readonly logger: Logger;
  /** Shown next to the palette item so the menu teaches the shortcut. */
  readonly hotkey: string;
}

/**
 * One tray per process, so this is module state rather than a container token
 * threaded through every caller that needs to know whether the tray exists.
 * `window-manager` asks before it hides a window instead of closing it: on a
 * desktop with no working tray, hiding the last window would leave the app
 * running with no way back to it.
 */
let tray: Tray | null = null;

export const isTrayActive = (): boolean => tray !== null;

/**
 * The icon ships inside the app bundle (see `files` in electron-builder.yml),
 * so this one path works both from a dev checkout and from inside app.asar —
 * Electron's patched fs reads the archive, and `build/` is relative to the app
 * root in both cases. A .ico on Windows because the tray is drawn from the
 * multi-resolution icon there; a 32px PNG on Linux, where the panel scales it.
 */
const iconPath = (): string =>
  join(app.getAppPath(), process.platform === 'win32' ? 'build/icon.ico' : 'build/icons/32x32.png');

export function createTray(deps: TrayDeps): void {
  if (tray) return;
  const scoped = deps.logger.child('tray');
  const icon = nativeImage.createFromPath(iconPath());
  if (icon.isEmpty()) {
    scoped.error('tray icon missing; running without a tray', { path: iconPath() });
    return;
  }

  try {
    tray = new Tray(icon);
  } catch (cause) {
    // No StatusNotifierItem host: a bare window manager, or GNOME without the
    // AppIndicator extension. The app is fully usable without a tray, so this
    // is a warning and not a failed startup.
    scoped.warn('tray unavailable on this desktop', { cause: String(cause) });
    return;
  }

  tray.setToolTip(BRANDING.appName);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${BRANDING.shortName}`, click: () => deps.windows.showMain() },
      {
        // The way in when the compositor refuses the global shortcut, which is
        // the one failure the user cannot work around from inside the app.
        // The accelerator is spelled into the label: `accelerator` here would
        // ask Electron to own the combination, and the global shortcut
        // already does. `sublabel` is macOS-only, so it would show nothing.
        label: deps.hotkey ? `Open palette (${deps.hotkey})` : 'Open palette',
        click: () => void deps.flow.onHotkey({ accelerator: deps.hotkey, mode: 'palette' }),
      },
      { type: 'separator' },
      // The only real exit once closing the window means "hide": app.quit()
      // and not tray.destroy(), so the will-quit teardown still runs.
      { label: `Quit ${BRANDING.shortName}`, click: () => app.quit() },
    ]),
  );
  // Windows raises the window on a left click; on Linux the panel owns the
  // click and delivers the menu instead, so this is a no-op there rather than
  // a second code path.
  tray.on('click', () => deps.windows.showMain());
}

/** Teardown seam for `will-quit`; a Tray left alive keeps the process warm. */
export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
