import { ok, type Logger, type Result, type SelectionSource } from '@ai-anywhere/shared';
import type { ClipboardService, KeystrokeService } from './contracts.js';
import type { CommandResult, CommandRunner } from './command.js';

/**
 * Shared fakes for the platform tests. They live in src (not a test folder)
 * because the package compiles with `tsc -b` and tests run against dist, so a
 * separate test root would need a second tsconfig for three small stubs.
 */
export const silentLogger = (): Logger => {
  const logger: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    child: () => logger,
  };
  return logger;
};

export interface FakeClipboard extends ClipboardService {
  /** Every read/write in order, for asserting the restore actually happened. */
  readonly log: readonly string[];
  current(): string;
}

export function fakeClipboard(initial = 'USER CLIPBOARD'): FakeClipboard {
  let value = initial;
  const log: string[] = [];
  const readText = async (): Promise<string> => {
    log.push(`read:${value}`);
    return value;
  };
  const writeText = async (text: string): Promise<void> => {
    log.push(`write:${text}`);
    value = text;
  };
  return {
    log,
    current: () => value,
    readText,
    writeText,
    async withPreservedClipboard(fn) {
      const previous = await readText();
      try {
        return await fn();
      } finally {
        await writeText(previous);
      }
    },
    async backend() {
      return 'electron';
    },
  };
}

export interface FakeKeystroke extends KeystrokeService {
  readonly calls: readonly string[];
}

/**
 * @param onCopy what the "target app" puts on the clipboard when Ctrl+C
 *   arrives; undefined means the app ignores the keystroke.
 */
export function fakeKeystroke(options: {
  clipboard: ClipboardService;
  onCopy?: string;
  copyResult?: Result<void>;
  pasteResult?: Result<void>;
  focusResult?: Result<void>;
}): FakeKeystroke {
  const calls: string[] = [];
  return {
    calls,
    async sendCopy() {
      calls.push('copy');
      const result = options.copyResult ?? ok(undefined);
      if (result.ok && options.onCopy !== undefined) {
        await options.clipboard.writeText(options.onCopy);
      }
      return result;
    },
    async sendPaste() {
      calls.push('paste');
      return options.pasteResult ?? ok(undefined);
    },
    async focusWindow(windowId) {
      calls.push(`focus:${windowId}`);
      return options.focusResult ?? ok(undefined);
    },
    async backend() {
      return 'xdotool';
    },
  };
}

export const fakeSource = (windowId: string | null = '4242'): SelectionSource => ({
  windowTitle: 'general — Slack',
  appName: 'slack',
  windowId,
  platform: 'linux',
});

/** CommandRunner whose tool availability and stdout are scripted per test. */
export function fakeCommands(options: {
  available?: readonly string[];
  stdout?: Record<string, string>;
  failing?: readonly string[];
}): CommandRunner & { readonly calls: readonly string[] } {
  const calls: string[] = [];
  const available = new Set(options.available ?? []);
  const failing = new Set(options.failing ?? []);
  return {
    calls,
    async run(file, args, stdin) {
      calls.push([file, ...args, ...(stdin === undefined ? [] : [`<${stdin}`])].join(' '));
      if (failing.has(file)) {
        return { ok: false, error: { code: 'UNKNOWN', message: `${file} failed` } };
      }
      const value: CommandResult = { stdout: options.stdout?.[file] ?? '', stderr: '' };
      return ok(value);
    },
    async has(file) {
      return available.has(file);
    },
  };
}
