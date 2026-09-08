import { appError, err, ok, type CustomPrompt, type KnownAppId } from '@ai-anywhere/shared';
import type { DatabaseHandle } from '../connection.js';
import type { PromptRepository } from '../contracts.js';

interface PromptRow {
  id: string;
  label: string;
  group: string;
  template: string;
  app_id: string | null;
  shortcut: string | null;
  created_at: number;
  updated_at: number;
}

const toPrompt = (row: PromptRow): CustomPrompt => ({
  id: row.id,
  label: row.label,
  group: row.group,
  template: row.template,
  appId: row.app_id as KnownAppId | null,
  shortcut: row.shortcut,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createPromptRepository(db: DatabaseHandle): PromptRepository {
  // "group" is a reserved word in SQLite, hence the quoting everywhere.
  const listStmt = db.prepare('SELECT * FROM prompts ORDER BY "group", label');
  const upsert = db.prepare(
    `INSERT INTO prompts (id, label, "group", template, app_id, shortcut, created_at, updated_at)
     VALUES (@id, @label, @group, @template, @appId, @shortcut, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       "group" = excluded."group",
       template = excluded.template,
       app_id = excluded.app_id,
       shortcut = excluded.shortcut,
       updated_at = excluded.updated_at`,
  );
  const deleteStmt = db.prepare('DELETE FROM prompts WHERE id = ?');

  return {
    list() {
      try {
        return ok((listStmt.all() as PromptRow[]).map(toPrompt));
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to list prompts', cause));
      }
    },
    save(prompt) {
      // The renderer is a trust boundary: an empty label makes an unclickable
      // palette row, and an empty template makes a prompt that says nothing.
      if (prompt.label.trim().length === 0) {
        return err(appError('VALIDATION', 'A prompt needs a name'));
      }
      if (prompt.template.trim().length === 0) {
        return err(appError('VALIDATION', 'A prompt needs a template'));
      }
      try {
        // An empty string is not a shortcut; store it as "none" so the binder
        // has one shape to check.
        const shortcut =
          prompt.shortcut === null || prompt.shortcut.trim().length === 0 ? null : prompt.shortcut;
        upsert.run({ ...prompt, label: prompt.label.trim(), template: prompt.template.trim(), shortcut });
        return ok({ ...prompt, shortcut });
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to save prompt', cause));
      }
    },
    delete(id) {
      try {
        deleteStmt.run(id);
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to delete prompt', cause));
      }
    },
  };
}
