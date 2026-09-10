import Database from 'better-sqlite3';
import type { Logger } from '@lipikit/shared';
import { runMigrations } from './migrations.js';

export type DatabaseHandle = Database.Database;

export interface OpenDatabaseOptions {
  /** Absolute file path, or ':memory:' in tests. */
  readonly file: string;
  readonly logger: Logger;
}

export function openDatabase({ file, logger }: OpenDatabaseOptions): DatabaseHandle {
  const db = new Database(file);
  // WAL keeps the UI readable while a write is in flight; FULL sync is
  // overkill for a local assistant, NORMAL survives app crashes.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  const applied = runMigrations(db);
  logger.child('database').info('database ready', { file, migrationsApplied: applied });
  return db;
}
