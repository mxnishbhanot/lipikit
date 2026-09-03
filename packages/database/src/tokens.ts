import { token, type Token } from '@ai-anywhere/shared';
import type { HistoryRepository, SettingsRepository } from './contracts.js';
import type { DatabaseHandle } from './connection.js';

// Explicit annotations: without them, declaration emit tries to inline
// better-sqlite3's namespace type and fails (TS4023).
export const DATABASE: Token<DatabaseHandle> = token<DatabaseHandle>('database.handle');
export const SETTINGS_REPOSITORY: Token<SettingsRepository> = token<SettingsRepository>('database.settings');
export const HISTORY_REPOSITORY: Token<HistoryRepository> = token<HistoryRepository>('database.history');
