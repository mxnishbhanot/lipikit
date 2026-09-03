import { appError, type Logger } from '@ai-anywhere/shared';
import type { Container } from '@ai-anywhere/shared';
import type { PlatformInfo, PlatformServices } from './contracts.js';
import { createActiveWindowService } from './active-window.js';
import { createElectronAutostartService } from './autostart.electron.js';
import { createElectronClipboardService } from './clipboard.electron.js';
import { createElectronHotkeyService } from './hotkey.electron.js';
import {
  ACTIVE_WINDOW_SERVICE,
  AUTOSTART_SERVICE,
  CLIPBOARD_SERVICE,
  HOTKEY_SERVICE,
  PLATFORM_SERVICES,
} from './tokens.js';

export function detectPlatformInfo(
  platform: NodeJS.Platform = process.platform,
  env: Record<string, string | undefined> = process.env,
): PlatformInfo {
  if (platform === 'win32') return { platform: 'win32', displayServer: null };
  if (platform !== 'linux') {
    // Windows + Linux only, by product decision. Fail loudly at startup.
    throw new Error(appError('PLATFORM_UNSUPPORTED', `Unsupported platform: ${platform}`).message);
  }
  const sessionType = env['XDG_SESSION_TYPE']?.toLowerCase();
  const displayServer =
    sessionType === 'wayland' || env['WAYLAND_DISPLAY']
      ? ('wayland' as const)
      : sessionType === 'x11' || env['DISPLAY']
        ? ('x11' as const)
        : null;
  return { platform: 'linux', displayServer };
}

export function createPlatformServices(logger: Logger, info = detectPlatformInfo()): PlatformServices {
  return {
    info,
    clipboard: createElectronClipboardService(),
    hotkey: createElectronHotkeyService(logger),
    activeWindow: createActiveWindowService(info),
    autostart: createElectronAutostartService(info),
  };
}

/** Registers each capability under its own token so features inject narrowly. */
export function registerPlatformServices(container: Container, services: PlatformServices): void {
  container.registerValue(PLATFORM_SERVICES, services);
  container.registerValue(CLIPBOARD_SERVICE, services.clipboard);
  container.registerValue(HOTKEY_SERVICE, services.hotkey);
  container.registerValue(ACTIVE_WINDOW_SERVICE, services.activeWindow);
  container.registerValue(AUTOSTART_SERVICE, services.autostart);
}
