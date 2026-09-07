import { token, type Token } from '@ai-anywhere/shared';
import type {
  ClipboardRepository,
  FavoritesRepository,
  HistoryRepository,
  PromptRepository,
  ProviderSettingsRepository,
  SettingsRepository,
} from './contracts.js';
import type { DatabaseHandle } from './connection.js';

// Explicit annotations: without them, declaration emit tries to inline
// better-sqlite3's namespace type and fails (TS4023).
export const DATABASE: Token<DatabaseHandle> = token<DatabaseHandle>('database.handle');
export const SETTINGS_REPOSITORY: Token<SettingsRepository> = token<SettingsRepository>('database.settings');
export const HISTORY_REPOSITORY: Token<HistoryRepository> = token<HistoryRepository>('database.history');
export const PROMPT_REPOSITORY: Token<PromptRepository> = token<PromptRepository>('database.prompts');
export const CLIPBOARD_REPOSITORY: Token<ClipboardRepository> =
  token<ClipboardRepository>('database.clipboard');
export const FAVORITES_REPOSITORY: Token<FavoritesRepository> =
  token<FavoritesRepository>('database.favorites');
export const PROVIDER_SETTINGS_REPOSITORY: Token<ProviderSettingsRepository> =
  token<ProviderSettingsRepository>('database.providerSettings');
