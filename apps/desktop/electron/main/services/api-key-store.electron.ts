import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, safeStorage } from 'electron';
import { appError, err, ok, type ProviderId } from '@lipikit/shared';
import type { ApiKeyStore } from '@lipikit/providers';

/**
 * Keys are encrypted with the OS keyring (DPAPI on Windows, libsecret/kwallet
 * on Linux) and stored outside SQLite, so a leaked/copied database file never
 * contains credentials. Renderer only ever learns whether a key exists.
 */
export function createElectronApiKeyStore(): ApiKeyStore {
  const file = join(app.getPath('userData'), 'credentials.json');

  const readAll = (): Record<string, string> => {
    if (!existsSync(file)) return {};
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
    } catch {
      return {};
    }
  };
  const writeAll = (data: Record<string, string>): void => {
    writeFileSync(file, JSON.stringify(data), { encoding: 'utf8', mode: 0o600 });
  };

  return {
    async get(providerId) {
      const stored = readAll()[providerId];
      if (!stored) return null;
      try {
        return safeStorage.decryptString(Buffer.from(stored, 'base64'));
      } catch {
        return null;
      }
    },
    async set(providerId: ProviderId, apiKey: string) {
      if (!safeStorage.isEncryptionAvailable()) {
        // Plaintext fallback would be worse than refusing: fail loudly.
        return err(appError('PERMISSION_DENIED', 'OS keyring unavailable; cannot store API key safely'));
      }
      const data = readAll();
      data[providerId] = safeStorage.encryptString(apiKey).toString('base64');
      writeAll(data);
      return ok(undefined);
    },
    async has(providerId) {
      return Boolean(readAll()[providerId]);
    },
    async delete(providerId) {
      const data = readAll();
      delete data[providerId];
      writeAll(data);
    },
  };
}
