import { randomUUID } from 'node:crypto';
import {
  appError,
  err,
  ok,
  type AppSettings,
  type CustomPrompt,
  type ProviderSettings,
  type Result,
  type SettingsBackup,
} from '@ai-anywhere/shared';
import type { PromptRepository, ProviderSettingsRepository, SettingsRepository } from './contracts.js';
import { DEFAULT_SETTINGS } from './repositories/settings.repository.js';

/** Bumped only when the payload shape changes incompatibly. */
export const BACKUP_VERSION = 1;

export interface BackupDeps {
  readonly settings: SettingsRepository;
  readonly prompts: PromptRepository;
  readonly providers: ProviderSettingsRepository;
}

export function buildBackup(deps: BackupDeps, appVersion: string): Result<SettingsBackup> {
  const settings = deps.settings.get();
  if (!settings.ok) return settings;
  const prompts = deps.prompts.list();
  if (!prompts.ok) return prompts;
  const providers = deps.providers.list();
  if (!providers.ok) return providers;
  return ok({
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    appVersion,
    settings: settings.value,
    prompts: prompts.value,
    providers: providers.value,
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * An import file is untrusted input — hand-edited, from an older build, or
 * simply the wrong file. Only keys the app knows survive: an unknown settings
 * key would otherwise become a permanent row nothing ever reads, and a
 * malformed prompt would land in the palette as an unclickable entry.
 */
const pickSettings = (value: unknown): Partial<AppSettings> => {
  if (!isRecord(value)) return {};
  const picked: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const incoming = value[key];
    if (incoming === undefined) continue;
    if (typeof incoming !== typeof DEFAULT_SETTINGS[key as keyof AppSettings]) continue;
    picked[key] = incoming;
  }
  return picked;
};

const pickPrompts = (value: unknown): readonly CustomPrompt[] => {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  return value.filter(isRecord).flatMap((raw) => {
    if (typeof raw['label'] !== 'string' || typeof raw['template'] !== 'string') return [];
    return [
      {
        id: typeof raw['id'] === 'string' ? raw['id'] : randomUUID(),
        label: raw['label'],
        group: typeof raw['group'] === 'string' ? raw['group'] : 'Imported',
        template: raw['template'],
        appId: (typeof raw['appId'] === 'string' ? raw['appId'] : null) as CustomPrompt['appId'],
        shortcut: typeof raw['shortcut'] === 'string' ? raw['shortcut'] : null,
        createdAt: typeof raw['createdAt'] === 'number' ? raw['createdAt'] : now,
        updatedAt: now,
      },
    ];
  });
};

const pickProviders = (value: unknown): readonly ProviderSettings[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap((raw) => {
    if (typeof raw['providerId'] !== 'string') return [];
    return [
      {
        providerId: raw['providerId'] as ProviderSettings['providerId'],
        enabled: raw['enabled'] !== false,
        baseUrl: typeof raw['baseUrl'] === 'string' ? raw['baseUrl'] : null,
        defaultModel: typeof raw['defaultModel'] === 'string' ? raw['defaultModel'] : null,
        updatedAt: Date.now(),
      },
    ];
  });
};

export function parseBackup(json: string): Result<SettingsBackup> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (cause) {
    return err(appError('VALIDATION', 'That file is not valid JSON', cause));
  }
  if (!isRecord(raw)) return err(appError('VALIDATION', 'That file is not a settings export'));
  const version = raw['version'];
  if (typeof version !== 'number' || version > BACKUP_VERSION) {
    return err(appError('VALIDATION', 'That export was written by a newer version of AI Anywhere'));
  }
  const settings = pickSettings(raw['settings']);
  const prompts = pickPrompts(raw['prompts']);
  const providers = pickProviders(raw['providers']);
  if (Object.keys(settings).length === 0 && prompts.length === 0 && providers.length === 0) {
    return err(appError('VALIDATION', 'That export contains nothing this version can read'));
  }
  return ok({
    version,
    exportedAt: typeof raw['exportedAt'] === 'number' ? raw['exportedAt'] : Date.now(),
    appVersion: typeof raw['appVersion'] === 'string' ? raw['appVersion'] : 'unknown',
    // Merged over defaults so a partial export still yields a full object.
    settings: { ...DEFAULT_SETTINGS, ...settings },
    prompts,
    providers,
  });
}

/**
 * Import is a merge, not a wipe: prompts upsert by id and provider rows
 * upsert by provider id, so re-importing your own export is a no-op instead
 * of duplicating everything. History and clipboard are never touched — they
 * are a log, not configuration.
 */
export function applyBackup(deps: BackupDeps, backup: SettingsBackup): Result<AppSettings> {
  const updated = deps.settings.update(backup.settings);
  if (!updated.ok) return updated;
  for (const prompt of backup.prompts) {
    const saved = deps.prompts.save(prompt);
    // One bad prompt must not abort the rest of the import.
    if (!saved.ok) continue;
  }
  for (const provider of backup.providers) {
    deps.providers.save({
      providerId: provider.providerId,
      enabled: provider.enabled,
      baseUrl: provider.baseUrl,
      defaultModel: provider.defaultModel,
    });
  }
  return ok(updated.value);
}
