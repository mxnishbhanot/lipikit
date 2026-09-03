export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child(scope: string): Logger;
}

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createConsoleLogger(scope = 'app', minLevel: LogLevel = 'info'): Logger {
  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>): void => {
    if (ORDER[level] < ORDER[minLevel]) return;
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} (${scope}) ${message}`;
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](line, meta ?? '');
  };
  return {
    debug: (m, meta) => log('debug', m, meta),
    info: (m, meta) => log('info', m, meta),
    warn: (m, meta) => log('warn', m, meta),
    error: (m, meta) => log('error', m, meta),
    child: (childScope) => createConsoleLogger(`${scope}:${childScope}`, minLevel),
  };
}
