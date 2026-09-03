import type { AppSettings, HistoryEntry, Result } from '@ai-anywhere/shared';

/**
 * Repositories, not an ORM: the schema is ~2 tables and every query is known
 * at build time. Features depend on these interfaces, so swapping SQLite for
 * anything else touches only this package.
 */
export interface SettingsRepository {
  get(): Result<AppSettings>;
  update(patch: Partial<AppSettings>): Result<AppSettings>;
}

export interface HistoryQuery {
  readonly limit: number;
  readonly offset: number;
}

export interface HistoryRepository {
  insert(entry: HistoryEntry): Result<void>;
  list(query: HistoryQuery): Result<readonly HistoryEntry[]>;
  purgeOlderThan(timestamp: number): Result<number>;
  clear(): Result<void>;
}
