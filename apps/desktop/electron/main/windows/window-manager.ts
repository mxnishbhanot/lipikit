import { join } from 'node:path';
import { BrowserWindow, screen, shell } from 'electron';
import type { AppEnv, CursorPoint, IpcEventContract, IpcEventName, Logger } from '@ai-anywhere/shared';

export interface WindowManager {
  /** Full settings/history window. */
  showMain(): BrowserWindow;
  /**
   * Small always-on-top popup shown next to the cursor after the hotkey fires.
   * Resolves only once the renderer has loaded, so the caller can broadcast
   * the captured selection without racing the first paint.
   */
  showOverlayAt(point: CursorPoint): Promise<BrowserWindow>;
  isOverlayVisible(): boolean;
  /**
   * Grow or shrink the popup to fit its content, keeping its top-left corner
   * where it is. Returns silently when the popup is gone: a resize that
   * arrives after the window closed is a race, not an error.
   */
  resizeOverlay(height: number): void;
  hideOverlay(): void;
  /** Type-safe main -> renderer push to every live window. */
  broadcast<E extends IpcEventName>(event: E, payload: IpcEventContract[E]): void;
  closeAll(): void;
}

const PRELOAD = join(__dirname, '../preload/index.js');

const OVERLAY_SIZE = { width: 560, height: 440 } as const;
/**
 * Height bounds for the content-driven resize. The floor keeps the header and
 * footer from colliding when a search matches nothing; the ceiling is applied
 * against the work area too, so a short display wins over this number.
 */
const OVERLAY_HEIGHT = { min: 220, max: 704 } as const;
/** Nudge away from the pointer so the popup never opens under the cursor. */
const OVERLAY_OFFSET = { x: 12, y: 16 } as const;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export function createWindowManager(env: AppEnv, logger: Logger): WindowManager {
  const scoped = logger.child('windows');
  let mainWindow: BrowserWindow | null = null;
  let overlayWindow: BrowserWindow | null = null;
  let overlayReady: Promise<void> = Promise.resolve();

  /** Same hardening for every window: no node in renderer, no popups. */
  const baseOptions = {
    show: false,
    backgroundColor: '#0b0b0f',
    webPreferences: {
      preload: PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
    },
  } as const;

  const load = (window: BrowserWindow, hash: string): void => {
    if (env.nodeEnv === 'development') {
      void window.loadURL(`${env.devServerUrl}#${hash}`);
    } else {
      void window.loadFile(join(__dirname, '../renderer/index.html'), { hash });
    }
  };

  const harden = (window: BrowserWindow): void => {
    // Any target="_blank" or window.open goes to the real browser, never to a
    // second Electron window with app privileges.
    window.webContents.setWindowOpenHandler(({ url }) => {
      void shell.openExternal(url);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith(env.devServerUrl)) event.preventDefault();
    });
  };

  return {
    showMain() {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        return mainWindow;
      }
      mainWindow = new BrowserWindow({
        ...baseOptions,
        width: 1_040,
        height: 720,
        minWidth: 840,
        minHeight: 560,
        title: 'AI Anywhere',
      });
      harden(mainWindow);
      mainWindow.on('ready-to-show', () => mainWindow?.show());
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
      load(mainWindow, '/');
      scoped.info('main window created');
      return mainWindow;
    },
    async showOverlayAt(point) {
      if (!overlayWindow || overlayWindow.isDestroyed()) {
        overlayWindow = new BrowserWindow({
          ...baseOptions,
          ...OVERLAY_SIZE,
          frame: false,
          // Transparent so the popup's own rounded corners are what the user
          // sees, instead of a square opaque frame behind them.
          transparent: true,
          backgroundColor: '#00000000',
          resizable: false,
          skipTaskbar: true,
          alwaysOnTop: true,
          // The popup is transient UI over another app's window; it must not
          // become a second "app window" in the switcher or the taskbar.
          minimizable: false,
          maximizable: false,
          fullscreenable: false,
        });
        harden(overlayWindow);
        const window = overlayWindow;
        overlayReady = new Promise((resolve) => {
          window.webContents.once('did-finish-load', () => resolve());
          window.webContents.once('did-fail-load', () => resolve());
        });
        overlayWindow.on('closed', () => {
          overlayWindow = null;
        });
        load(overlayWindow, '/overlay');
      }

      // Wait for the renderer before showing: on the very first press the
      // window exists but has painted nothing, and showing it early flashes an
      // empty frame over the user's app.
      await overlayReady;

      // Keep the whole popup inside the work area of the display the cursor is
      // on, so a selection near a screen edge does not open a half-offscreen
      // window — and so a second monitor is handled without special cases.
      const { workArea } = screen.getDisplayNearestPoint(point);
      overlayWindow.setBounds({
        x: clamp(point.x + OVERLAY_OFFSET.x, workArea.x, workArea.x + workArea.width - OVERLAY_SIZE.width),
        y: clamp(point.y + OVERLAY_OFFSET.y, workArea.y, workArea.y + workArea.height - OVERLAY_SIZE.height),
        ...OVERLAY_SIZE,
      });
      overlayWindow.show();
      overlayWindow.focus();
      return overlayWindow;
    },
    isOverlayVisible() {
      return Boolean(overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible());
    },
    resizeOverlay(height) {
      if (!overlayWindow || overlayWindow.isDestroyed()) return;
      const bounds = overlayWindow.getBounds();
      const { workArea } = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      // Never taller than what is left below the popup's own top edge, or the
      // footer ends up off the bottom of the screen.
      const room = workArea.y + workArea.height - bounds.y;
      const next = clamp(Math.round(height), OVERLAY_HEIGHT.min, Math.min(OVERLAY_HEIGHT.max, room));
      if (next === bounds.height) return;
      overlayWindow.setBounds({ ...bounds, height: next });
    },
    hideOverlay() {
      // hide(), never close(): hiding hands focus back to the app the user was
      // typing in, which is the only thing that makes the paste land in the
      // right place on Windows and on Wayland.
      if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
        overlayWindow.hide();
      }
    },
    broadcast(event, payload) {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(event, payload);
      }
    },
    closeAll() {
      for (const window of BrowserWindow.getAllWindows()) window.destroy();
      mainWindow = null;
      overlayWindow = null;
      overlayReady = Promise.resolve();
    },
  };
}
