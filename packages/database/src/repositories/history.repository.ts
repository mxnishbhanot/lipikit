import { appError, err, ok, type HistoryEntry } from '@ai-anywhere/shared';
import type { DatabaseHandle } from '../connection.js';
import type { HistoryRepository } from '../contracts.js';

interface HistoryRow {
  id: string;
  action: string;
  provider_id: string;
  model: string;
  input: string;
  output: string;
  tone: string | null;
  app_name: string | null;
  created_at: number;
}

const toEntry = (row: HistoryRow): HistoryEntry =>
  ({
    id: row.id,
    action: row.action,
    providerId: row.provider_id,
    model: row.model,
    input: row.input,
    output: row.output,
    tone: row.tone,
    appName: row.app_name,
    createdAt: row.created_at,
  }) as HistoryEntry;

export function createHistoryRepository(db: DatabaseHandle): HistoryRepository {
  const insertStmt = db.prepare(
    `INSERT INTO history (id, action, provider_id, model, input, output, tone, app_name, created_at)
     VALUES (@id, @action, @providerId, @model, @input, @output, @tone, @appName, @createdAt)`,
  );
  const listStmt = db.prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?');
  const purgeStmt = db.prepare('DELETE FROM history WHERE created_at < ?');

  return {
    insert(entry) {
      try {
        insertStmt.run(entry);
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to insert history entry', cause));
      }
    },
    list({ limit, offset }) {
      try {
        const rows = listStmt.all(limit, offset) as HistoryRow[];
        return ok(rows.map(toEntry));
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to list history', cause));
      }
    },
    purgeOlderThan(timestamp) {
      try {
        return ok(purgeStmt.run(timestamp).changes);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to purge history', cause));
      }
    },
    clear() {
      try {
        db.exec('DELETE FROM history');
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to clear history', cause));
      }
    },
  };
}
