import type {
  AppSettings,
  ClipboardEntry,
  CustomPrompt,
  FavoriteKind,
  HistoryEntry,
  ProviderSettings,
  ProviderSettingsPatch,
  Result,
} from '@ai-anywhere/shared';

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

/** User-authored prompts. `save` upserts, so create and edit are one call. */
export interface PromptRepository {
  list(): Result<readonly CustomPrompt[]>;
  save(prompt: CustomPrompt): Result<CustomPrompt>;
  delete(id: string): Result<void>;
}

export interface HistoryRepository {
  insert(entry: HistoryEntry): Result<void>;
  list(query: HistoryQuery): Result<readonly HistoryEntry[]>;
  purgeOlderThan(timestamp: number): Result<number>;
  delete(id: string): Result<void>;
  clear(): Result<void>;
}

/**
 * Recorded clipboard copies. `trimTo` is how the retention limit is enforced:
 * one call after each insert beats a scheduled sweep nobody can see running.
 */
export interface ClipboardRepository {
  insert(entry: ClipboardEntry): Result<void>;
  list(query: HistoryQuery): Result<readonly ClipboardEntry[]>;
  /** Most recent text, for deduping a poll against the last recorded copy. */
  latestText(): Result<string | null>;
  trimTo(limit: number): Result<number>;
  delete(id: string): Result<void>;
  clear(): Result<void>;
}

/** Starred commands and prompts. `toggle` returns the state it left behind. */
export interface FavoritesRepository {
  list(kind: FavoriteKind): Result<readonly string[]>;
  toggle(kind: FavoriteKind, id: string): Result<boolean>;
  clear(): Result<void>;
}

/** Per-provider overrides; a provider with no row uses the catalog defaults. */
export interface ProviderSettingsRepository {
  list(): Result<readonly ProviderSettings[]>;
  save(patch: ProviderSettingsPatch): Result<readonly ProviderSettings[]>;
  /** Endpoint overrides only, in the shape the provider registry wants. */
  baseUrlOverrides(): Record<string, string>;
}
