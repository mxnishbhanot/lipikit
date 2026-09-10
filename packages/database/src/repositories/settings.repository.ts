import { ACCENT_COLORS, appError, err, ok, type AppSettings, type WindowBounds } from '@lipikit/shared';
import type { DatabaseHandle } from '../connection.js';
import type { SettingsRepository } from '../contracts.js';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  accentColor: 'emerald',
  globalHotkey: 'Control+Space',
  // Unbound: a global accelerator the user did not ask for is one taken away
  // from every other app on the machine. Prompt shortcuts live on the prompt
  // rows, not here.
  clientReplyHotkey: '',
  defaultProvider: 'openai',
  defaultModel: 'gpt-5-mini',
  defaultTone: 'neutral',
  temperature: 0.7,
  maxTokens: 1_024,
  requestTimeoutMs: 60_000,
  streamingEnabled: true,
  launchAtLogin: false,
  historyEnabled: true,
  historyRetentionDays: 30,
  clipboardHistoryEnabled: false,
  clipboardHistoryLimit: 50,
  conversationMemoryEnabled: false,
  onboardingCompleted: false,
  minimizeToTray: true,
  windowBounds: null,
};

/**
 * Window geometry is written by main, but `settings:update` is a renderer
 * channel: a NaN or a string here would be handed straight to setBounds and
 * throw on the next launch, so a malformed value is dropped rather than saved.
 */
const validBounds = (bounds: WindowBounds): boolean =>
  (['x', 'y', 'width', 'height'] as const).every((key) => Number.isFinite(bounds[key])) &&
  bounds.width > 0 &&
  bounds.height > 0;

const clamp = (value: number | undefined, min: number, max: number, round: boolean): number | undefined => {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const bounded = Math.min(Math.max(value, min), max);
  return round ? Math.round(bounded) : bounded;
};

/**
 * The renderer is a trust boundary: a bad temperature or a zero timeout means
 * a provider 400 or a popup that hangs forever, so numbers are clamped on the
 * way in rather than guarded at every read. An unusable value is dropped from
 * the patch, which leaves the previous (or default) value in place.
 */
const sanitize = (patch: Partial<AppSettings>): Partial<AppSettings> => {
  const {
    temperature,
    maxTokens,
    requestTimeoutMs,
    historyRetentionDays,
    clipboardHistoryLimit,
    globalHotkey,
    accentColor,
    windowBounds,
    ...rest
  } = patch;
  const bounded = {
    temperature: clamp(temperature, 0, 2, false),
    maxTokens: clamp(maxTokens, 16, 32_000, true),
    requestTimeoutMs: clamp(requestTimeoutMs, 1_000, 600_000, true),
    historyRetentionDays: clamp(historyRetentionDays, 1, 3_650, true),
    clipboardHistoryLimit: clamp(clipboardHistoryLimit, 1, 1_000, true),
  };
  return {
    ...rest,
    // undefined means "not in this patch"; null means "forget the geometry".
    ...(windowBounds !== undefined && (windowBounds === null || validBounds(windowBounds))
      ? { windowBounds }
      : {}),
    // An accent name the renderer made up would write a `[data-accent]` value
    // no stylesheet answers, leaving the UI with no accent at all.
    ...(accentColor !== undefined && ACCENT_COLORS.includes(accentColor) ? { accentColor } : {}),
    // The main shortcut is the only door into the popup, so a blank one is
    // dropped from the patch rather than saved: the optional shortcuts are
    // clearable, this one is not.
    ...(globalHotkey === undefined || globalHotkey.trim().length === 0 ? {} : { globalHotkey }),
    ...(bounded.temperature === undefined ? {} : { temperature: bounded.temperature }),
    ...(bounded.maxTokens === undefined ? {} : { maxTokens: bounded.maxTokens }),
    ...(bounded.requestTimeoutMs === undefined ? {} : { requestTimeoutMs: bounded.requestTimeoutMs }),
    ...(bounded.historyRetentionDays === undefined
      ? {}
      : { historyRetentionDays: bounded.historyRetentionDays }),
    ...(bounded.clipboardHistoryLimit === undefined
      ? {}
      : { clipboardHistoryLimit: bounded.clipboardHistoryLimit }),
  };
};

/**
 * Key/value rows rather than a one-row table: adding a setting then needs no
 * migration, and an unknown key from an older build is ignored, not fatal.
 */
export function createSettingsRepository(db: DatabaseHandle): SettingsRepository {
  const selectAll = db.prepare('SELECT key, value FROM settings');
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );

  const read = (): AppSettings => {
    const rows = selectAll.all() as { key: string; value: string }[];
    const stored: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        stored[row.key] = JSON.parse(row.value);
      } catch {
        // Corrupt row: fall back to the default for that key.
      }
    }
    return { ...DEFAULT_SETTINGS, ...stored };
  };

  return {
    get() {
      try {
        return ok(read());
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to read settings', cause));
      }
    },
    update(rawPatch) {
      try {
        const patch = sanitize(rawPatch);
        const next = { ...read(), ...patch };
        db.transaction(() => {
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined) continue;
            upsert.run(key, JSON.stringify(value));
          }
        })();
        return ok(next);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to update settings', cause));
      }
    },
  };
}
