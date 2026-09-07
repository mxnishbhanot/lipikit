import { appError, err, ok, type Result } from '../result.js';

export type NodeEnv = 'development' | 'production' | 'test';

export interface AppEnv {
  readonly nodeEnv: NodeEnv;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Renderer dev-server origin; unused in a packaged build. */
  readonly devServerUrl: string;
  readonly databaseFileName: string;
  /** Fallback for local models; real keys live in the OS keychain, not here. */
  readonly ollamaBaseUrl: string;
  /**
   * Calibration knob for synthetic input. Injecting Ctrl+C and then reading
   * the clipboard is a race against the target app: Slack and VS Code answer
   * in ~40ms, a loaded Electron app or an RDP session can take 250ms+. Raise
   * this if capture comes back empty on a slow machine.
   */
  readonly inputSettleMs: number;
}

const DEFAULTS: AppEnv = {
  nodeEnv: 'development',
  logLevel: 'info',
  devServerUrl: 'http://localhost:5173',
  databaseFileName: 'ai-anywhere.db',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  inputSettleMs: 120,
};

const NODE_ENVS: readonly NodeEnv[] = ['development', 'production', 'test'];
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

/** Parsed once at process start; never read process.env deeper in the app. */
export function loadEnv(source: Record<string, string | undefined>): Result<AppEnv> {
  const nodeEnv = source['NODE_ENV'] ?? DEFAULTS.nodeEnv;
  if (!NODE_ENVS.includes(nodeEnv as NodeEnv)) {
    return err(appError('VALIDATION', `Invalid NODE_ENV: ${nodeEnv}`));
  }
  const logLevel = source['AI_ANYWHERE_LOG_LEVEL'] ?? DEFAULTS.logLevel;
  if (!LOG_LEVELS.includes(logLevel as (typeof LOG_LEVELS)[number])) {
    return err(appError('VALIDATION', `Invalid AI_ANYWHERE_LOG_LEVEL: ${logLevel}`));
  }
  const rawSettle = source['AI_ANYWHERE_INPUT_SETTLE_MS'];
  const inputSettleMs = rawSettle === undefined ? DEFAULTS.inputSettleMs : Number(rawSettle);
  if (!Number.isFinite(inputSettleMs) || inputSettleMs < 0 || inputSettleMs > 5_000) {
    return err(appError('VALIDATION', `Invalid AI_ANYWHERE_INPUT_SETTLE_MS: ${String(rawSettle)}`));
  }
  return ok({
    nodeEnv: nodeEnv as NodeEnv,
    logLevel: logLevel as AppEnv['logLevel'],
    devServerUrl: source['VITE_DEV_SERVER_URL'] ?? DEFAULTS.devServerUrl,
    databaseFileName: source['AI_ANYWHERE_DB_FILE'] ?? DEFAULTS.databaseFileName,
    ollamaBaseUrl: source['OLLAMA_BASE_URL'] ?? DEFAULTS.ollamaBaseUrl,
    inputSettleMs,
  });
}
