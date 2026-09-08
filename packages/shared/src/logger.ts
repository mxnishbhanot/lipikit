export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Every formatted line also lands in a ring buffer, so the Feedback page can
 * export a log without the app writing one to disk on every run — nothing is
 * persisted unless the user asks for the file.
 *
 * ponytail: in-memory only, so a crash takes the log with it. Write lines
 * through to a rotating file if crash reports ever need more than the session.
 */
const RECENT_LIMIT = 500;
const recent: string[] = [];

export const recentLogLines = (): readonly string[] => recent;

export function createConsoleLogger(scope = 'app', minLevel: LogLevel = 'info'): Logger {
  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    if (ORDER[level] < ORDER[minLevel]) return;
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} (${scope}) ${message}`;
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](line, meta ?? '');
    recent.push(meta === undefined ? line : `${line} ${JSON.stringify(meta)}`);
    if (recent.length > RECENT_LIMIT) recent.shift();
  };
  return {
    debug: (m, meta) => log('debug', m, meta),
    info: (m, meta) => log('info', m, meta),
    warn: (m, meta) => log('warn', m, meta),
    error: (m, meta) => log('error', m, meta),
    child: (childScope) => createConsoleLogger(`${scope}:${childScope}`, minLevel),
  };
}
