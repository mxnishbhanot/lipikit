import { appError, err, ok, type ProviderId, type ProviderSettings } from '@lipikit/shared';
import type { DatabaseHandle } from '../connection.js';
import type { ProviderSettingsRepository } from '../contracts.js';

interface ProviderRow {
  provider_id: string;
  enabled: number;
  base_url: string | null;
  default_model: string | null;
  updated_at: number;
}

const toSettings = (row: ProviderRow): ProviderSettings => ({
  providerId: row.provider_id as ProviderId,
  enabled: row.enabled !== 0,
  baseUrl: row.base_url,
  defaultModel: row.default_model,
  updatedAt: row.updated_at,
});

/**
 * The renderer is a trust boundary and this string ends up as the base URL of
 * every request for that provider: anything but http(s) (file:, data:, a bare
 * hostname the SDK would resolve oddly) is refused rather than normalised.
 */
const normalizeBaseUrl = (raw: string | null): string | null | undefined => {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return trimmed.replace(/\/$/, '');
  } catch {
    return undefined;
  }
};

export function createProviderSettingsRepository(db: DatabaseHandle): ProviderSettingsRepository {
  const listStmt = db.prepare('SELECT * FROM providers ORDER BY provider_id');
  const getStmt = db.prepare('SELECT * FROM providers WHERE provider_id = ?');
  const upsert = db.prepare(
    `INSERT INTO providers (provider_id, enabled, base_url, default_model, updated_at)
     VALUES (@providerId, @enabled, @baseUrl, @defaultModel, @updatedAt)
     ON CONFLICT(provider_id) DO UPDATE SET
       enabled = excluded.enabled,
       base_url = excluded.base_url,
       default_model = excluded.default_model,
       updated_at = excluded.updated_at`,
  );

  const readAll = (): readonly ProviderSettings[] => (listStmt.all() as ProviderRow[]).map(toSettings);

  return {
    list() {
      try {
        return ok(readAll());
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to read provider settings', cause));
      }
    },
    save(patch) {
      const baseUrl = patch.baseUrl === undefined ? undefined : normalizeBaseUrl(patch.baseUrl);
      if (baseUrl === undefined && patch.baseUrl !== undefined) {
        return err(appError('VALIDATION', 'Endpoint must be an http(s) URL'));
      }
      try {
        const existingRow = getStmt.get(patch.providerId) as ProviderRow | undefined;
        const existing = existingRow ? toSettings(existingRow) : null;
        upsert.run({
          providerId: patch.providerId,
          enabled: (patch.enabled ?? existing?.enabled ?? true) ? 1 : 0,
          baseUrl: baseUrl === undefined ? (existing?.baseUrl ?? null) : baseUrl,
          defaultModel:
            patch.defaultModel === undefined
              ? (existing?.defaultModel ?? null)
              : patch.defaultModel?.trim() || null,
          updatedAt: Date.now(),
        });
        return ok(readAll());
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to save provider settings', cause));
      }
    },
    baseUrlOverrides() {
      const overrides: Record<string, string> = {};
      for (const entry of readAll()) {
        if (entry.baseUrl !== null) overrides[entry.providerId] = entry.baseUrl;
      }
      return overrides;
    },
  };
}
