import { appError, type Logger, type PlatformCapabilities } from '@ai-anywhere/shared';
import type { Container } from '@ai-anywhere/shared';
import type { PlatformInfo, PlatformServices } from './contracts.js';
import { createCommandRunner, type CommandRunner } from './command.js';
import { createActiveWindowService } from './active-window.js';
import { createElectronAutostartService } from './autostart.electron.js';
import { createClipboardService } from './clipboard.js';
import { createCursorService } from './cursor.js';
import { createElectronHotkeyService } from './hotkey.electron.js';
import { createKeystrokeService } from './keystroke.js';
import { createSelectionService, createTextReplacementService } from './selection.js';
import {
  ACTIVE_WINDOW_SERVICE,
  AUTOSTART_SERVICE,
  CLIPBOARD_SERVICE,
  CURSOR_SERVICE,
  HOTKEY_SERVICE,
  KEYSTROKE_SERVICE,
  PLATFORM_SERVICES,
  SELECTION_SERVICE,
  TEXT_REPLACEMENT_SERVICE,
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

export interface PlatformOptions {
  /** Wait applied around synthetic input; see AppEnv.inputSettleMs. */
  readonly inputSettleMs: number;
}

export function createPlatformServices(
  logger: Logger,
  options: PlatformOptions,
  info = detectPlatformInfo(),
  commands: CommandRunner = createCommandRunner(),
): PlatformServices {
  const clipboard = createClipboardService(info, commands, logger);
  const keystroke = createKeystrokeService(info, commands, logger);
  const activeWindow = createActiveWindowService(info, commands);
  const selectionDeps = {
    clipboard,
    keystroke,
    activeWindow,
    logger,
    timing: { settleMs: options.inputSettleMs },
  };

  return {
    info,
    clipboard,
    keystroke,
    activeWindow,
    hotkey: createElectronHotkeyService(logger),
    selection: createSelectionService(selectionDeps),
    replacement: createTextReplacementService(selectionDeps),
    cursor: createCursorService(),
    autostart: createElectronAutostartService(info),
    async capabilities(): Promise<PlatformCapabilities> {
      const [clipboardBackend, keystrokeBackend] = await Promise.all([
        clipboard.backend(),
        keystroke.backend(),
      ]);
      // One backend does both directions: if keys cannot be injected, neither
      // automatic capture nor automatic replacement is possible, and the UI
      // needs to say so instead of failing per action.
      const canInject = keystrokeBackend !== 'none';
      return {
        platform: info.platform,
        displayServer: info.displayServer,
        clipboardBackend,
        keystrokeBackend,
        canCaptureSelection: canInject,
        canReplaceText: canInject,
      };
    },
  };
}

/** Registers each capability under its own token so features inject narrowly. */
export function registerPlatformServices(container: Container, services: PlatformServices): void {
  container.registerValue(PLATFORM_SERVICES, services);
  container.registerValue(CLIPBOARD_SERVICE, services.clipboard);
  container.registerValue(KEYSTROKE_SERVICE, services.keystroke);
  container.registerValue(HOTKEY_SERVICE, services.hotkey);
  container.registerValue(ACTIVE_WINDOW_SERVICE, services.activeWindow);
  container.registerValue(SELECTION_SERVICE, services.selection);
  container.registerValue(TEXT_REPLACEMENT_SERVICE, services.replacement);
  container.registerValue(CURSOR_SERVICE, services.cursor);
  container.registerValue(AUTOSTART_SERVICE, services.autostart);
}
