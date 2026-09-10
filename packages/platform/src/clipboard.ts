import { clipboard } from 'electron';
import type { Logger } from '@lipikit/shared';
import type { ClipboardBackendId, ClipboardService, PlatformInfo } from './contracts.js';
import type { CommandRunner } from './command.js';

/**
 * Electron's clipboard covers Windows, X11 and Wayland, so it is the only
 * backend that normally runs. The CLI fallbacks exist because a clipboard is
 * a compositor-side service that can genuinely be missing: a Wayland session
 * where the app holds no focused surface, or an X11 session started without a
 * clipboard manager, both make Electron's clipboard throw or come back dead.
 * Losing a rewrite because of that is worse than shelling out once.
 *
 * Order: Electron -> wl-copy/wl-paste (Wayland) -> xclip (X11).
 */
interface Backend {
  readonly id: ClipboardBackendId;
  read(): Promise<string>;
  write(text: string): Promise<void>;
}

export function createClipboardService(
  info: PlatformInfo,
  commands: CommandRunner,
  logger: Logger,
): ClipboardService {
  const scoped = logger.child('clipboard');

  const electronBackend: Backend = {
    id: 'electron',
    async read() {
      return clipboard.readText();
    },
    async write(text) {
      clipboard.writeText(text);
    },
  };

  const cliBackend = (
    id: ClipboardBackendId,
    reader: readonly string[],
    writer: readonly string[],
  ): Backend => {
    const [readFile, ...readArgs] = reader;
    const [writeFile, ...writeArgs] = writer;
    return {
      id,
      async read() {
        if (!readFile) throw new Error(`${id}: no reader configured`);
        const result = await commands.run(readFile, readArgs);
        if (!result.ok) throw new Error(result.error.message);
        return result.value.stdout;
      },
      async write(text) {
        if (!writeFile) throw new Error(`${id}: no writer configured`);
        const result = await commands.run(writeFile, writeArgs, text);
        if (!result.ok) throw new Error(result.error.message);
      },
    };
  };

  const candidates = async (): Promise<readonly Backend[]> => {
    const chain: Backend[] = [electronBackend];
    if (info.platform !== 'linux') return chain;
    if (await commands.has('wl-copy')) {
      // --no-newline: wl-paste appends one, which would corrupt a selection
      // that legitimately ends without a trailing newline.
      chain.push(cliBackend('wl-clipboard', ['wl-paste', '--no-newline'], ['wl-copy']));
    }
    if (await commands.has('xclip')) {
      chain.push(
        cliBackend(
          'xclip',
          ['xclip', '-selection', 'clipboard', '-out'],
          ['xclip', '-selection', 'clipboard', '-in'],
        ),
      );
    }
    return chain;
  };

  let active: ClipboardBackendId = 'electron';

  /** Walks the chain until one backend answers; remembers which one did. */
  const attempt = async <T>(operation: string, run: (backend: Backend) => Promise<T>): Promise<T> => {
    const chain = await candidates();
    let lastError: unknown = new Error('no clipboard backend available');
    for (const backend of chain) {
      try {
        const value = await run(backend);
        if (active !== backend.id) {
          scoped.info('clipboard backend switched', { from: active, to: backend.id, operation });
          active = backend.id;
        }
        return value;
      } catch (cause) {
        lastError = cause;
        scoped.warn('clipboard backend failed', { backend: backend.id, operation });
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  };

  const readText = (): Promise<string> => attempt('read', (backend) => backend.read());
  const writeText = (text: string): Promise<void> => attempt('write', (backend) => backend.write(text));

  return {
    readText,
    writeText,
    async withPreservedClipboard(fn) {
      // Read first: if the snapshot itself fails we still run the body, but we
      // restore to empty rather than to garbage.
      let previous = '';
      try {
        previous = await readText();
      } catch {
        scoped.warn('could not snapshot clipboard; will restore to empty');
      }
      try {
        return await fn();
      } finally {
        try {
          await writeText(previous);
        } catch {
          // Restoring is best-effort by definition; never mask the real result.
          scoped.warn('could not restore clipboard');
        }
      }
    },
    async backend() {
      return active;
    },
  };
}
