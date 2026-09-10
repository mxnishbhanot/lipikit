import { join } from 'node:path';
import { app, BrowserWindow, screen, shell } from 'electron';
import {
  BRANDING,
  type AppEnv,
  type CursorPoint,
  type IpcEventContract,
  type IpcEventName,
  type Logger,
} from '@lipikit/shared';
import type { SettingsRepository } from '@lipikit/database';
import { isTrayActive } from '../services/tray.js';
import { notify } from '../services/notify.js';
import { fitToWorkArea } from './bounds.js';

export interface WindowManager {
  /** Full settings/history window. */
  showMain(): BrowserWindow;
  /**
   * Small always-on-top popup shown next to the cursor after the hotkey fires.
   * Resolves only once the renderer has loaded, so the caller can broadcast
   * the captured selection without racing the first paint.
   */
  showOverlayAt(point: CursorPoint): Promise<BrowserWindow>;
  /**
   * Build and load the popup while nothing is waiting on it. Without this the
   * first hotkey press pays for the whole renderer boot (window + React +
   * first paint) before the popup can be shown, which is the difference
   * between a ~40ms popup and a ~600ms one.
   */
  prewarmOverlay(): void;
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
  /**
   * Same push, popup only. Token deltas arrive hundreds of times per answer
   * and the settings window has no use for any of them; broadcasting them
   * serialises every chunk twice.
   */
  sendToOverlay<E extends IpcEventName>(event: E, payload: IpcEventContract[E]): void;
  closeAll(): void;
}

const PRELOAD = join(__dirname, '../preload/index.js');

/**
 * The window, not the popup: the renderer keeps a transparent gutter inside
 * these bounds so its own drop shadow has somewhere to fall, which is why this
 * is wider than the 556px popup the design system describes.
 */
const OVERLAY_SIZE = { width: 588, height: 440 } as const;
/** The gutter the renderer reserves on every side, in CSS pixels. */
const OVERLAY_GUTTER = 16;
/**
 * Height bounds for the content-driven resize. The floor keeps the header and
 * footer from colliding when a search matches nothing; the ceiling is applied
 * against the work area too, so a short display wins over this number.
 */
const OVERLAY_HEIGHT = { min: 220 + OVERLAY_GUTTER * 2, max: 704 } as const;
/** Nudge away from the pointer so the popup never opens under the cursor. */
const OVERLAY_OFFSET = { x: 12, y: 16 } as const;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export function createWindowManager(
  env: AppEnv,
  logger: Logger,
  settings: SettingsRepository,
): WindowManager {
  const scoped = logger.child('windows');
  let mainWindow: BrowserWindow | null = null;
  let overlayWindow: BrowserWindow | null = null;
  let overlayReady: Promise<void> = Promise.resolve();
  /**
   * Set by `before-quit`, which fires for every real exit — the tray's Quit
   * item, `app:quit` from the About page, a session logout. Without it the
   * close handler below would cancel the last close of a quit and leave the
   * process alive with no windows.
   */
  let quitting = false;
  /** The tray hint is a one-time explanation, not a notification per close. */
  let trayHintShown = false;

  app.on('before-quit', () => {
    quitting = true;
  });

  const readSettings = () => {
    const stored = settings.get();
    return stored.ok ? stored.value : null;
  };

  /**
   * Saved geometry, refitted to whichever display it now lands on. Returns
   * nothing on a first run, so the defaults below stay in charge.
   */
  const restoredBounds = (): Partial<Electron.Rectangle> => {
    const bounds = readSettings()?.windowBounds ?? null;
    if (!bounds) return {};
    return fitToWorkArea(bounds, screen.getDisplayMatching(bounds).workArea);
  };

  /**
   * `getNormalBounds`, not `getBounds`: a maximized or minimized window
   * reports the maximized rectangle, and restoring that would lose the size
   * the user actually chose.
   */
  const rememberBounds = (window: BrowserWindow): void => {
    if (window.isDestroyed()) return;
    settings.update({ windowBounds: window.getNormalBounds() });
  };

  /**
   * Closing or minimizing keeps the app alive in the tray, because the global
   * hotkey is the product: quitting on a window close would take it away
   * without saying so. Only ever when there is a tray to restore from —
   * hiding the last window on a desktop with no tray host would leave the app
   * running with no way back to it.
   */
  const hideToTray = (window: BrowserWindow): boolean => {
    if (quitting || !isTrayActive() || readSettings()?.minimizeToTray !== true) return false;
    window.hide();
    if (!trayHintShown) {
      trayHintShown = true;
      notify(
        `${BRANDING.shortName} is still running`,
        'The window is in the tray and your hotkey still works.',
      );
    }
    return true;
  };

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

  /** Creates and loads the popup if it is not already alive. */
  const ensureOverlay = (): BrowserWindow => {
    if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;
    const window = new BrowserWindow({
      ...baseOptions,
      ...OVERLAY_SIZE,
      frame: false,
      // Transparent so the popup's own rounded corners are what the user
      // sees, instead of a square opaque frame behind them.
      transparent: true,
      backgroundColor: '#00000000',
      // The compositor's shadow is drawn around the *window* rectangle, so on
      // a transparent frameless window it appears as a hard square behind
      // rounded corners. The popup draws its own shadow in CSS instead, inside
      // the gutter above, which is the only way the two can share a shape.
      hasShadow: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      // The popup is transient UI over another app's window; it must not
      // become a second "app window" in the switcher or the taskbar.
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
    });
    harden(window);
    overlayReady = new Promise((resolve) => {
      window.webContents.once('did-finish-load', () => resolve());
      window.webContents.once('did-fail-load', () => resolve());
    });
    window.on('closed', () => {
      overlayWindow = null;
    });
    overlayWindow = window;
    load(window, '/overlay');
    return window;
  };

  return {
    showMain() {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // show() alone leaves a minimized window minimized, which is exactly
        // the state the tray and the second-instance handler get called in.
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        return mainWindow;
      }
      const window = new BrowserWindow({
        ...baseOptions,
        width: 1_040,
        height: 720,
        minWidth: 840,
        minHeight: 560,
        // Native frame on purpose: it is the Fluent title bar on Windows 11
        // and the GNOME/Adwaita header on Ubuntu, with the platform's own
        // window controls, snap layouts and double-click-to-maximize for
        // free. A custom title bar would reimplement all three, worse, twice.
        title: BRANDING.appName,
        ...restoredBounds(),
      });
      mainWindow = window;
      harden(window);
      window.on('ready-to-show', () => window.show());
      // 'resized'/'moved' fire once the gesture ends, unlike 'resize'/'move',
      // so the geometry is written per drag rather than per frame.
      window.on('resized', () => rememberBounds(window));
      window.on('moved', () => rememberBounds(window));
      window.on('minimize', () => {
        // Nothing to remember here: a minimized window reports its normal
        // bounds, which the resize/move handlers already stored.
        hideToTray(window);
      });
      window.on('close', (event) => {
        rememberBounds(window);
        if (hideToTray(window)) event.preventDefault();
      });
      window.on('closed', () => {
        mainWindow = null;
        // 'window-all-closed' never fires while the prewarmed overlay is
        // alive, so closing the only visible window with minimize-to-tray off
        // has to end the process itself.
        if (!quitting) app.quit();
      });
      load(window, '/');
      scoped.info('main window created');
      return window;
    },
    prewarmOverlay() {
      ensureOverlay();
    },
    async showOverlayAt(point) {
      const overlay = ensureOverlay();

      // Wait for the renderer before showing: on the very first press the
      // window exists but has painted nothing, and showing it early flashes an
      // empty frame over the user's app.
      await overlayReady;

      // Placed like a context menu, on the display the cursor is on: below and
      // right of the caret when there is room, flipped above or left of it when
      // there is not.
      //
      // Clamping alone was not enough. Near an edge it slid the popup along
      // that edge instead of flipping it, so a press in the bottom-right corner
      // of the screen — the taskbar corner, the notification corner, the corner
      // people keep windows in — pinned the popup to the corner and left it
      // nowhere near the text it was about to rewrite.
      const display = screen.getDisplayNearestPoint(point);
      const { workArea } = display;
      const { width } = OVERLAY_SIZE;
      // The renderer owns the height — it is the only side that knows how tall
      // its content is — so a press repositions the window without resetting
      // what the last measurement made it. Placement below uses that height so
      // a tall popup still flips instead of hanging off the bottom.
      const { height } = overlay.getBounds();
      const fitsRight = point.x + OVERLAY_OFFSET.x + width <= workArea.x + workArea.width;
      const fitsBelow = point.y + OVERLAY_OFFSET.y + height <= workArea.y + workArea.height;
      const bounds = {
        x: clamp(
          fitsRight ? point.x + OVERLAY_OFFSET.x : point.x - OVERLAY_OFFSET.x - width,
          workArea.x,
          workArea.x + workArea.width - width,
        ),
        y: clamp(
          fitsBelow ? point.y + OVERLAY_OFFSET.y : point.y - OVERLAY_OFFSET.y - height,
          workArea.y,
          workArea.y + workArea.height - height,
        ),
        width,
        height,
      };
      overlay.setBounds(bounds);
      // Logged with the display's scale factor because that is the first thing
      // to check when the popup lands somewhere unexpected: a cursor read in
      // physical pixels against bounds set in DIPs looks exactly like this.
      scoped.debug('overlay positioned', {
        point,
        bounds,
        workArea,
        scaleFactor: display.scaleFactor,
      });
      overlay.show();
      overlay.focus();
      return overlay;
    },
    isOverlayVisible() {
      return Boolean(overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible());
    },
    resizeOverlay(height) {
      if (!overlayWindow || overlayWindow.isDestroyed()) return;
      const bounds = overlayWindow.getBounds();
      const { workArea } = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      const next = clamp(
        Math.round(height),
        OVERLAY_HEIGHT.min,
        Math.min(OVERLAY_HEIGHT.max, workArea.height),
      );
      // A popup that grew past the bottom of the screen moves up to fit rather
      // than being truncated: the footer holds Replace, so losing it costs the
      // user the whole point of the window.
      const y =
        next > workArea.y + workArea.height - bounds.y
          ? Math.max(workArea.y, workArea.y + workArea.height - next)
          : bounds.y;
      if (next === bounds.height && y === bounds.y) return;
      overlayWindow.setBounds({ ...bounds, y, height: next });
      // The popup is sized by the renderer measuring itself, so a clipped
      // window is either a measurement that never arrived or a clamp that bit:
      // both are visible in this one line.
      scoped.debug('overlay resized', {
        requested: Math.round(height),
        applied: next,
        from: bounds.height,
        y,
      });
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
    sendToOverlay(event, payload) {
      if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send(event, payload);
    },
    closeAll() {
      for (const window of BrowserWindow.getAllWindows()) window.destroy();
      mainWindow = null;
      overlayWindow = null;
      overlayReady = Promise.resolve();
    },
  };
}
