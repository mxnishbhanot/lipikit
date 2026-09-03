import type { DatabaseHandle } from './connection.js';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: string;
}

/** Append-only. Never edit a shipped migration — add the next one. */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    up: `
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS history (
        id          TEXT PRIMARY KEY,
        action      TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        model       TEXT NOT NULL,
        input       TEXT NOT NULL,
        output      TEXT NOT NULL,
        tone        TEXT,
        app_name    TEXT,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_history_created_at ON history (created_at DESC);
    `,
  },
];

/** Runs pending migrations in one transaction each; returns how many ran. */
export function runMigrations(db: DatabaseHandle): number {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)',
  );
  const current =
    (db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get() as { v: number | null }).v ?? 0;

  let applied = 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    db.transaction(() => {
      db.exec(migration.up);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        Date.now(),
      );
    })();
    applied += 1;
  }
  return applied;
}
