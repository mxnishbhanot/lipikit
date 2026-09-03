import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { MIGRATIONS, runMigrations } from './migrations.js';
import { createHistoryRepository } from './repositories/history.repository.js';
import { createSettingsRepository, DEFAULT_SETTINGS } from './repositories/settings.repository.js';

test('migrations are idempotent and settings/history round-trip', () => {
  const db = new Database(':memory:');
  assert.equal(runMigrations(db), MIGRATIONS.length);
  assert.equal(runMigrations(db), 0, 'second run must apply nothing');

  const settings = createSettingsRepository(db);
  assert.deepEqual(settings.get(), { ok: true, value: DEFAULT_SETTINGS });
  const updated = settings.update({ defaultTone: 'formal' });
  assert.ok(updated.ok && updated.value.defaultTone === 'formal');
  const reread = settings.get();
  assert.ok(reread.ok && reread.value.defaultTone === 'formal');
  assert.ok(reread.ok && reread.value.globalHotkey === DEFAULT_SETTINGS.globalHotkey);

  const history = createHistoryRepository(db);
  const entry = {
    id: 'h1',
    action: 'rewrite' as const,
    providerId: 'openai' as const,
    model: 'gpt-4o-mini',
    input: 'teh cat',
    output: 'the cat',
    tone: 'neutral' as const,
    appName: null,
    createdAt: 1_000,
  };
  assert.ok(history.insert(entry).ok);
  const listed = history.list({ limit: 10, offset: 0 });
  assert.ok(listed.ok && listed.value.length === 1 && listed.value[0]?.output === 'the cat');
  assert.deepEqual(history.purgeOlderThan(2_000), { ok: true, value: 1 });
});
