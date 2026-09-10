import { appError, err, ok, type ClipboardEntry } from '@lipikit/shared';
import type { DatabaseHandle } from '../connection.js';
import type { ClipboardRepository } from '../contracts.js';

interface ClipboardRow {
  id: string;
  text: string;
  app_name: string | null;
  created_at: number;
}

const toEntry = (row: ClipboardRow): ClipboardEntry => ({
  id: row.id,
  text: row.text,
  appName: row.app_name,
  createdAt: row.created_at,
});

export function createClipboardRepository(db: DatabaseHandle): ClipboardRepository {
  const insertStmt = db.prepare(
    `INSERT INTO clipboard (id, text, app_name, created_at)
     VALUES (@id, @text, @appName, @createdAt)`,
  );
  const listStmt = db.prepare('SELECT * FROM clipboard ORDER BY created_at DESC LIMIT ? OFFSET ?');
  const latestStmt = db.prepare('SELECT text FROM clipboard ORDER BY created_at DESC LIMIT 1');
  // Keep the newest `limit` rows, delete the rest. Written as a NOT IN over
  // the same table rather than a rowid offset, because rowids are not the
  // ordering the user sees — created_at is.
  const trimStmt = db.prepare(
    `DELETE FROM clipboard WHERE id NOT IN (
       SELECT id FROM clipboard ORDER BY created_at DESC LIMIT ?
     )`,
  );
  const deleteStmt = db.prepare('DELETE FROM clipboard WHERE id = ?');

  return {
    insert(entry) {
      try {
        insertStmt.run(entry);
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to record clipboard entry', cause));
      }
    },
    list({ limit, offset }) {
      try {
        return ok((listStmt.all(limit, offset) as ClipboardRow[]).map(toEntry));
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to list clipboard history', cause));
      }
    },
    latestText() {
      try {
        const row = latestStmt.get() as { text: string } | undefined;
        return ok(row?.text ?? null);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to read clipboard history', cause));
      }
    },
    trimTo(limit) {
      try {
        return ok(trimStmt.run(Math.max(limit, 0)).changes);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to trim clipboard history', cause));
      }
    },
    delete(id) {
      try {
        deleteStmt.run(id);
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to delete clipboard entry', cause));
      }
    },
    clear() {
      try {
        db.exec('DELETE FROM clipboard');
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to clear clipboard history', cause));
      }
    },
  };
}
