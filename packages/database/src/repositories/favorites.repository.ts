import { appError, err, ok, type FavoriteKind } from '@ai-anywhere/shared';
import type { DatabaseHandle } from '../connection.js';
import type { FavoritesRepository } from '../contracts.js';

export function createFavoritesRepository(db: DatabaseHandle): FavoritesRepository {
  const listStmt = db.prepare('SELECT item_id FROM favorites WHERE kind = ? ORDER BY created_at DESC');
  const hasStmt = db.prepare('SELECT 1 FROM favorites WHERE kind = ? AND item_id = ?');
  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO favorites (kind, item_id, created_at) VALUES (?, ?, ?)',
  );
  const deleteStmt = db.prepare('DELETE FROM favorites WHERE kind = ? AND item_id = ?');

  return {
    list(kind) {
      try {
        return ok((listStmt.all(kind) as { item_id: string }[]).map((row) => row.item_id));
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to list favorites', cause));
      }
    },
    toggle(kind: FavoriteKind, id: string) {
      if (id.trim().length === 0) return err(appError('VALIDATION', 'A favorite needs an id'));
      try {
        // Read-then-write in one transaction: two windows can both star the
        // same command, and the second must not flip it back off.
        return ok(
          db.transaction(() => {
            if (hasStmt.get(kind, id) !== undefined) {
              deleteStmt.run(kind, id);
              return false;
            }
            insertStmt.run(kind, id, Date.now());
            return true;
          })(),
        );
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to toggle favorite', cause));
      }
    },
    clear() {
      try {
        db.exec('DELETE FROM favorites');
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to clear favorites', cause));
      }
    },
  };
}
