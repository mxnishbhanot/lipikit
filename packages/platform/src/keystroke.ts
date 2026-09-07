import { appError, err, ok, type Logger, type Result } from '@ai-anywhere/shared';
import type { KeystrokeBackendId, KeystrokeService, PlatformInfo } from './contracts.js';
import type { CommandRunner } from './command.js';

/**
 * Injecting Ctrl+C / Ctrl+V is the whole trick behind "works everywhere":
 * Slack, Chrome, Firefox, VS Code, Cursor, Jira, Gmail, Discord, Teams and
 * WhatsApp share no automation API, but all of them handle the clipboard
 * shortcuts. Each OS/session gets a different injector:
 *
 *   Windows  nut.js (optional, native) -> PowerShell SendKeys
 *   X11      xdotool
 *   Wayland  ydotool (needs ydotoold + /dev/uinput access)
 *
 * A backend is resolved once and cached: probing on every hotkey press would
 * put two process spawns in front of the user's keystroke.
 */

/** Linux input event codes, from linux/input-event-codes.h. */
const KEY = { LEFTCTRL: 29, C: 46, V: 47 } as const;

/** ydotool takes `code:pressed` pairs; press both, release in reverse order. */
const ydotoolCombo = (key: number): string[] => [
  `${KEY.LEFTCTRL}:1`,
  `${key}:1`,
  `${key}:0`,
  `${KEY.LEFTCTRL}:0`,
];

interface Backend {
  readonly id: KeystrokeBackendId;
  copy(): Promise<Result<void>>;
  paste(): Promise<Result<void>>;
  focus(windowId: string): Promise<Result<void>>;
}

/**
 * Optional native backend. nut.js is not a declared dependency: it is a
 * native module that needs a per-Electron-version rebuild, and forcing that
 * on every contributor to make a fallback path marginally more reliable is a
 * bad trade. Install it and this backend takes over automatically.
 *
 * ponytail: dynamic import + shape check instead of a typed dependency;
 * declare it properly if nut.js becomes mandatory.
 */
interface NutKeyboard {
  type(...keys: unknown[]): Promise<unknown>;
  pressKey(...keys: unknown[]): Promise<unknown>;
  releaseKey(...keys: unknown[]): Promise<unknown>;
}

interface NutModule {
  keyboard: NutKeyboard;
  Key: Record<string, unknown>;
}

const NUT_SPECIFIERS = ['@nut-tree-fork/nut-js', '@nut-tree/nut-js'] as const;

async function loadNut(logger: Logger): Promise<NutModule | null> {
  for (const specifier of NUT_SPECIFIERS) {
    try {
      const loaded = (await import(/* @vite-ignore */ specifier)) as Partial<NutModule>;
      const keyboard = loaded.keyboard;
      const Key = loaded.Key;
      if (keyboard && Key && typeof keyboard.pressKey === 'function') {
        logger.info('using nut.js for keystroke injection', { specifier });
        return { keyboard, Key };
      }
    } catch {
      // Not installed, or failed to load its .node binary. Next candidate.
    }
  }
  return null;
}

function createNutBackend(nut: NutModule): Backend {
  const combo = async (letter: 'C' | 'V'): Promise<Result<void>> => {
    const ctrl = nut.Key['LeftControl'];
    const key = nut.Key[letter];
    if (ctrl === undefined || key === undefined) {
      return err(appError('PLATFORM_UNSUPPORTED', 'nut.js key table missing LeftControl/letter'));
    }
    try {
      await nut.keyboard.pressKey(ctrl, key);
      await nut.keyboard.releaseKey(key, ctrl);
      return ok(undefined);
    } catch (cause) {
      return err(appError('UNKNOWN', 'nut.js keystroke failed', cause));
    }
  };
  return {
    id: 'nut',
    copy: () => combo('C'),
    paste: () => combo('V'),
    async focus() {
      // nut.js has no window activation on Windows; hiding the overlay is what
      // returns focus there.
      return err(appError('PLATFORM_UNSUPPORTED', 'nut.js cannot activate a window'));
    },
  };
}

/**
 * PowerShell SendKeys: always present on Windows, no install step. Add-Type
 * costs ~200-400ms on first call, which is why nut.js is preferred when
 * available. `-STA` matters: SendKeys drives the Windows message queue and
 * misbehaves on an MTA thread.
 */
function createPowershellBackend(commands: CommandRunner): Backend {
  const sendKeys = async (sequence: '^c' | '^v'): Promise<Result<void>> => {
    const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${sequence}')`;
    const result = await commands.run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-STA',
      '-Command',
      script,
    ]);
    return result.ok ? ok(undefined) : err(result.error);
  };
  return {
    id: 'powershell',
    copy: () => sendKeys('^c'),
    paste: () => sendKeys('^v'),
    async focus(windowId) {
      // Digits only: the handle comes from our own detector, but it reaches
      // this function as a string across IPC, so it gets validated here.
      if (!/^\d+$/.test(windowId)) {
        return err(appError('VALIDATION', `Not a window handle: ${windowId}`));
      }
      const script = [
        "Add-Type -Namespace AIA -Name Focus -MemberDefinition '",
        '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h);',
        '[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int c);',
        "';",
        // SW_SHOWNA = 8: raise it without stealing the restore animation, then
        // make it foreground.
        `[void][AIA.Focus]::ShowWindow([System.IntPtr]${windowId}, 8);`,
        `[void][AIA.Focus]::SetForegroundWindow([System.IntPtr]${windowId})`,
      ].join('');
      const result = await commands.run('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        script,
      ]);
      return result.ok ? ok(undefined) : err(result.error);
    },
  };
}

function createXdotoolBackend(commands: CommandRunner): Backend {
  // --clearmodifiers: the user is still physically holding Ctrl (they just
  // pressed the hotkey), and without this xdotool's Ctrl+C would arrive as
  // Ctrl+Ctrl+C and be swallowed.
  const key = async (combo: 'ctrl+c' | 'ctrl+v'): Promise<Result<void>> => {
    const result = await commands.run('xdotool', ['key', '--clearmodifiers', combo]);
    return result.ok ? ok(undefined) : err(result.error);
  };
  return {
    id: 'xdotool',
    copy: () => key('ctrl+c'),
    paste: () => key('ctrl+v'),
    async focus(windowId) {
      if (!/^\d+$/.test(windowId)) {
        return err(appError('VALIDATION', `Not an X11 window id: ${windowId}`));
      }
      // --sync blocks until the window is actually active, so the paste that
      // follows cannot race the compositor.
      const result = await commands.run('xdotool', ['windowactivate', '--sync', windowId]);
      return result.ok ? ok(undefined) : err(result.error);
    },
  };
}

function createYdotoolBackend(commands: CommandRunner): Backend {
  const key = async (code: number): Promise<Result<void>> => {
    const result = await commands.run('ydotool', ['key', ...ydotoolCombo(code)]);
    if (result.ok) return ok(undefined);
    return err(
      appError(
        'PERMISSION_DENIED',
        'ydotool failed — is ydotoold running and is your user in the input group?',
        result.error.message,
      ),
    );
  };
  return {
    id: 'ydotool',
    copy: () => key(KEY.C),
    paste: () => key(KEY.V),
    async focus() {
      // No Wayland protocol lets one client raise another's window. Focus
      // returns to the previous app when the overlay hides, and that is all
      // we get.
      return err(appError('PLATFORM_UNSUPPORTED', 'Wayland has no window activation for clients'));
    },
  };
}

const UNSUPPORTED_MESSAGE =
  'No way to send keystrokes on this session. Linux: install xdotool (X11) or ydotool (Wayland).';

const NO_BACKEND: Backend = {
  id: 'none',
  copy: async () => err(appError('PLATFORM_UNSUPPORTED', UNSUPPORTED_MESSAGE)),
  paste: async () => err(appError('PLATFORM_UNSUPPORTED', UNSUPPORTED_MESSAGE)),
  focus: async () => err(appError('PLATFORM_UNSUPPORTED', UNSUPPORTED_MESSAGE)),
};

export function createKeystrokeService(
  info: PlatformInfo,
  commands: CommandRunner,
  logger: Logger,
): KeystrokeService {
  const scoped = logger.child('keystroke');
  let resolved: Promise<Backend> | null = null;

  const pick = async (): Promise<Backend> => {
    if (info.platform === 'win32') {
      const nut = await loadNut(scoped);
      if (nut) return createNutBackend(nut);
      return createPowershellBackend(commands);
    }
    // X11 first even under XWayland-capable sessions: xdotool needs no daemon
    // and no uinput permission, so it fails far less often than ydotool.
    if (info.displayServer === 'x11' && (await commands.has('xdotool'))) {
      return createXdotoolBackend(commands);
    }
    if (await commands.has('ydotool')) return createYdotoolBackend(commands);
    if (await commands.has('xdotool')) return createXdotoolBackend(commands);
    scoped.warn('no keystroke backend available', { displayServer: info.displayServer });
    return NO_BACKEND;
  };

  const resolveBackend = (): Promise<Backend> => {
    resolved ??= pick();
    return resolved;
  };

  return {
    async sendCopy() {
      return (await resolveBackend()).copy();
    },
    async sendPaste() {
      return (await resolveBackend()).paste();
    },
    async focusWindow(windowId) {
      return (await resolveBackend()).focus(windowId);
    },
    async backend() {
      return (await resolveBackend()).id;
    },
  };
}
