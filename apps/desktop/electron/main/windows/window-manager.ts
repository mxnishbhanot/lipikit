import { join } from 'node:path';
import { BrowserWindow, shell } from 'electron';
import type { AppEnv, IpcEventContract, IpcEventName, Logger } from '@ai-anywhere/shared';

export interface WindowManager {
  /** Full settings/history window. */
  showMain(): BrowserWindow;
  /** Small always-on-top popup shown at the caret after the hotkey fires. */
  showOverlay(): BrowserWindow;
  hideOverlay(): void;
  /** Type-safe main -> renderer push to every live window. */
  broadcast<E extends IpcEventName>(event: E, payload: IpcEventContract[E]): void;
  closeAll(): void;
}

const PRELOAD = join(__dirname, '../preload/index.js');

export function createWindowManager(env: AppEnv, logger: Logger): WindowManager {
  const scoped = logger.child('windows');
  let mainWindow: BrowserWindow | null = null;
  let overlayWindow: BrowserWindow | null = null;

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
    showOverlay() {
      if (!overlayWindow || overlayWindow.isDestroyed()) {
        overlayWindow = new BrowserWindow({
          ...baseOptions,
          width: 560,
          height: 320,
          frame: false,
          resizable: false,
          skipTaskbar: true,
          alwaysOnTop: true,
        });
        harden(overlayWindow);
        overlayWindow.on('closed', () => {
          overlayWindow = null;
        });
        load(overlayWindow, '/overlay');
      }
      overlayWindow.center();
      overlayWindow.show();
      overlayWindow.focus();
      return overlayWindow;
    },
    hideOverlay() {
      overlayWindow?.hide();
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
    },
  };
}
