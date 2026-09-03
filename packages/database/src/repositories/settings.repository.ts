import { appError, err, ok, type AppSettings } from '@ai-anywhere/shared';
import type { DatabaseHandle } from '../connection.js';
import type { SettingsRepository } from '../contracts.js';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  globalHotkey: 'Control+Shift+Space',
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o-mini',
  defaultTone: 'neutral',
  launchAtLogin: false,
  historyEnabled: true,
  historyRetentionDays: 30,
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
    update(patch) {
      try {
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
