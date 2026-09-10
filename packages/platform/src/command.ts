import { execFile } from 'node:child_process';
import { appError, err, ok, type Result } from '@lipikit/shared';

/**
 * Every native capability on Linux is a CLI tool that may or may not be
 * installed, so "is this tool present" is asked constantly. One helper, one
 * cache: probing `xdotool` on every hotkey press would add a process spawn to
 * the hot path for a fact that cannot change while the app runs.
 *
 * execFile (not exec) throughout: no shell means no quoting rules and no way
 * for a window title or a chunk of user text to become a command.
 */
export interface CommandResult {
  readonly stdout: string;
  readonly stderr: string;
}

export interface CommandRunner {
  run(file: string, args: readonly string[], stdin?: string): Promise<Result<CommandResult>>;
  /** Cached `command -v` probe. */
  has(file: string): Promise<boolean>;
}

const DEFAULT_TIMEOUT_MS = 5_000;

export function createCommandRunner(): CommandRunner {
  const present = new Map<string, Promise<boolean>>();

  const run: CommandRunner['run'] = (file, args, stdin) =>
    new Promise((resolve) => {
      const child = execFile(
        file,
        [...args],
        { timeout: DEFAULT_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            const code = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'NOT_FOUND' : 'UNKNOWN';
            resolve(err(appError(code, `${file} failed: ${error.message}`, stderr || undefined)));
            return;
          }
          resolve(ok({ stdout, stderr }));
        },
      );
      // Text goes in over stdin, never as an argv element: a selection can be
      // megabytes long and can contain anything at all.
      if (stdin !== undefined) {
        child.stdin?.on('error', () => {
          /* the tool exited before reading; the callback above reports it */
        });
        child.stdin?.end(stdin);
      }
    });

  return {
    run,
    has(file) {
      // Every probed tool is a POSIX CLI; on Windows the answer is always no
      // and spawning a shell to learn that is pure latency.
      if (process.platform === 'win32') return Promise.resolve(false);
      const cached = present.get(file);
      if (cached) return cached;
      const probe = (async () => {
        // `command -v` is a shell builtin, so this needs the shell explicitly;
        // `which` is not installed on every minimal container/distro.
        const result = await run('/bin/sh', ['-c', `command -v ${JSON.stringify(file)} >/dev/null 2>&1`]);
        return result.ok;
      })();
      present.set(file, probe);
      return probe;
    },
  };
}

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
