import assert from 'node:assert/strict';
import { test } from 'node:test';
import Database from 'better-sqlite3';
import { MIGRATIONS, runMigrations } from './migrations.js';
import { createHistoryRepository } from './repositories/history.repository.js';
import { createPromptRepository } from './repositories/prompt.repository.js';
import { createSettingsRepository, DEFAULT_SETTINGS } from './repositories/settings.repository.js';
import { createClipboardRepository } from './repositories/clipboard.repository.js';
import { createFavoritesRepository } from './repositories/favorites.repository.js';
import { createProviderSettingsRepository } from './repositories/provider-settings.repository.js';
import { applyBackup, BACKUP_VERSION, buildBackup, parseBackup } from './backup.js';

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

test('settings update clamps out-of-range numbers and drops unusable ones', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const settings = createSettingsRepository(db);

  const clamped = settings.update({ temperature: 9, maxTokens: 1, requestTimeoutMs: 10_000_000 });
  assert.ok(clamped.ok);
  assert.equal(clamped.value.temperature, 2);
  assert.equal(clamped.value.maxTokens, 16);
  assert.equal(clamped.value.requestTimeoutMs, 600_000);

  const rejected = settings.update({ temperature: Number.NaN });
  assert.ok(rejected.ok);
  assert.equal(rejected.value.temperature, 2, 'a NaN patch must leave the stored value alone');
});

test('custom prompts round-trip, upsert on save, and validate', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const prompts = createPromptRepository(db);

  assert.deepEqual(prompts.list(), { ok: true, value: [] });

  const prompt = {
    id: 'p1',
    label: 'Bug report',
    group: 'Developer',
    template: 'Turn this into a bug report for {{app}}:\n\n{{text}}',
    appId: 'jira' as const,
    createdAt: 1,
    updatedAt: 1,
  };
  assert.ok(prompts.save(prompt).ok);

  // Same id twice is an edit, not a second row.
  assert.ok(prompts.save({ ...prompt, label: 'Bug report v2', updatedAt: 2 }).ok);
  const listed = prompts.list();
  assert.ok(listed.ok);
  assert.equal(listed.value.length, 1);
  assert.equal(listed.value[0]?.label, 'Bug report v2');
  assert.equal(listed.value[0]?.appId, 'jira');

  assert.ok(!prompts.save({ ...prompt, id: 'p2', label: '  ' }).ok);
  assert.ok(!prompts.save({ ...prompt, id: 'p2', template: '' }).ok);

  assert.ok(prompts.delete('p1').ok);
  assert.deepEqual(prompts.list(), { ok: true, value: [] });
});

test('clipboard history records, dedupes by trim limit, and clears', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const clipboard = createClipboardRepository(db);

  assert.deepEqual(clipboard.latestText(), { ok: true, value: null });
  for (let index = 0; index < 5; index += 1) {
    assert.ok(
      clipboard.insert({
        id: `c${index}`,
        text: `copy ${index}`,
        appName: 'slack',
        createdAt: 1_000 + index,
      }).ok,
    );
  }
  assert.deepEqual(clipboard.latestText(), { ok: true, value: 'copy 4' });

  const trimmed = clipboard.trimTo(2);
  assert.deepEqual(trimmed, { ok: true, value: 3 });
  const listed = clipboard.list({ limit: 10, offset: 0 });
  assert.ok(listed.ok);
  assert.deepEqual(
    listed.value.map((entry) => entry.text),
    ['copy 4', 'copy 3'],
  );

  assert.ok(clipboard.delete('c4').ok);
  assert.ok(clipboard.clear().ok);
  assert.deepEqual(clipboard.list({ limit: 10, offset: 0 }), { ok: true, value: [] });
});

test('favorites toggle on and off, scoped by kind', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const favorites = createFavoritesRepository(db);

  assert.deepEqual(favorites.toggle('command', 'rewrite'), { ok: true, value: true });
  // Same id under a different kind is a different favourite.
  assert.deepEqual(favorites.toggle('prompt', 'rewrite'), { ok: true, value: true });
  assert.deepEqual(favorites.list('command'), { ok: true, value: ['rewrite'] });

  assert.deepEqual(favorites.toggle('command', 'rewrite'), { ok: true, value: false });
  assert.deepEqual(favorites.list('command'), { ok: true, value: [] });
  assert.deepEqual(favorites.list('prompt'), { ok: true, value: ['rewrite'] });
  assert.ok(!favorites.toggle('command', ' ').ok);
});

test('provider settings upsert, refuse a non-http endpoint, and expose overrides', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const providers = createProviderSettingsRepository(db);

  assert.deepEqual(providers.list(), { ok: true, value: [] });
  assert.deepEqual(providers.baseUrlOverrides(), {});

  const saved = providers.save({ providerId: 'ollama', baseUrl: 'http://10.0.0.5:11434/v1/' });
  assert.ok(saved.ok);
  assert.equal(saved.value.length, 1);
  // Trailing slash normalised away; the SDK appends its own path.
  assert.deepEqual(providers.baseUrlOverrides(), { ollama: 'http://10.0.0.5:11434/v1' });
  assert.equal(saved.value[0]?.enabled, true);

  // A patch that omits baseUrl must not wipe the stored one.
  const disabled = providers.save({ providerId: 'ollama', enabled: false });
  assert.ok(disabled.ok);
  assert.equal(disabled.value[0]?.enabled, false);
  assert.equal(disabled.value[0]?.baseUrl, 'http://10.0.0.5:11434/v1');

  assert.ok(!providers.save({ providerId: 'ollama', baseUrl: 'file:///etc/passwd' }).ok);
  // Explicit null clears the override.
  assert.ok(providers.save({ providerId: 'ollama', baseUrl: null }).ok);
  assert.deepEqual(providers.baseUrlOverrides(), {});
});

test('export/import round-trips settings and prompts, and rejects junk', () => {
  const db = new Database(':memory:');
  runMigrations(db);
  const deps = {
    settings: createSettingsRepository(db),
    prompts: createPromptRepository(db),
    providers: createProviderSettingsRepository(db),
  };

  deps.settings.update({ defaultTone: 'formal', maxTokens: 2_048 });
  deps.prompts.save({
    id: 'p1',
    label: 'Bug report',
    group: 'Developer',
    template: 'Report: {{text}}',
    appId: 'jira',
    createdAt: 1,
    updatedAt: 1,
  });
  deps.providers.save({ providerId: 'groq', enabled: false });

  const exported = buildBackup(deps, '0.1.0');
  assert.ok(exported.ok);
  assert.equal(exported.value.version, BACKUP_VERSION);
  assert.equal(exported.value.prompts.length, 1);

  // A fresh database imports the file and comes back identical.
  const fresh = new Database(':memory:');
  runMigrations(fresh);
  const target = {
    settings: createSettingsRepository(fresh),
    prompts: createPromptRepository(fresh),
    providers: createProviderSettingsRepository(fresh),
  };
  const parsed = parseBackup(JSON.stringify(exported.value));
  assert.ok(parsed.ok);
  const applied = applyBackup(target, parsed.value);
  assert.ok(applied.ok);
  assert.equal(applied.value.defaultTone, 'formal');
  assert.equal(applied.value.maxTokens, 2_048);
  const importedPrompts = target.prompts.list();
  assert.ok(importedPrompts.ok && importedPrompts.value[0]?.label === 'Bug report');
  const importedProviders = target.providers.list();
  assert.ok(importedProviders.ok && importedProviders.value[0]?.enabled === false);

  // Importing the same file twice is a merge, not a duplicate.
  assert.ok(applyBackup(target, parsed.value).ok);
  const again = target.prompts.list();
  assert.ok(again.ok && again.value.length === 1);

  assert.ok(!parseBackup('not json').ok);
  assert.ok(!parseBackup('{"version":99}').ok);
  assert.ok(!parseBackup('{"version":1}').ok, 'an empty export carries nothing to apply');
  // Unknown keys and wrong types are dropped, not stored.
  const hostile = parseBackup(
    '{"version":1,"settings":{"defaultTone":"casual","temperature":"hot","evil":true}}',
  );
  assert.ok(hostile.ok);
  assert.equal(hostile.value.settings.defaultTone, 'casual');
  assert.equal(hostile.value.settings.temperature, DEFAULT_SETTINGS.temperature);
  assert.ok(!('evil' in hostile.value.settings));
});
