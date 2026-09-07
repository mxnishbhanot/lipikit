import assert from 'node:assert/strict';
import { test } from 'vitest';
import { COMMANDS, filterCommands, findCommand, resolveInstruction } from './commands.js';
import { mergeCommands, suggestedFor } from './palette.js';
import { renderPrompt } from './render.js';

test('every command renders a valid prompt once its input is supplied', () => {
  for (const command of COMMANDS) {
    const input = command.inputPlaceholder === undefined ? '' : 'Spanish';
    const rendered = renderPrompt({
      action: command.action,
      text: 'hello world',
      ...(command.tone === undefined ? {} : { tone: command.tone }),
      ...(() => {
        const instruction = resolveInstruction(command, input);
        return instruction === undefined ? {} : { instruction };
      })(),
    });
    assert.ok(rendered.ok, `${command.id} failed to render: ${rendered.ok ? '' : rendered.error.message}`);
    assert.ok(rendered.value.prompt.includes('hello world'));
  }
});

test('command ids are unique and findable', () => {
  assert.equal(new Set(COMMANDS.map((command) => command.id)).size, COMMANDS.length);
  assert.equal(findCommand('commit-message')?.label, 'Commit Message');
  assert.equal(findCommand('nope'), undefined);
});

test('search ranks a label prefix above a keyword hit', () => {
  const [first] = filterCommands('pr');
  assert.equal(first?.id, 'professional');
  assert.ok(filterCommands('pr').some((command) => command.id === 'pr-description'));
});

test('search matches keywords and is case-insensitive', () => {
  assert.equal(filterCommands('TLDR')[0]?.id, 'summarize');
  assert.equal(filterCommands('conventional')[0]?.id, 'commit-message');
  assert.deepEqual(filterCommands('zzz'), []);
  assert.equal(filterCommands('   ').length, COMMANDS.length);
});

test('user input is appended to the static instruction', () => {
  assert.equal(resolveInstruction(findCommand('translate')!, 'German'), 'Target language: German');
  assert.equal(resolveInstruction(findCommand('ask-ai')!, ' why? '), 'why?');
  assert.equal(resolveInstruction(findCommand('shorten')!), undefined);
});

test('context variables are substituted, and values are not rescanned', () => {
  const rendered = renderPrompt({
    action: 'custom',
    text: 'raw {{app}} text',
    template: 'In {{app}} ({{windowTitle}}), given clipboard "{{clipboard}}":\n\n{{selection}}',
    variables: { app: 'Slack', windowTitle: 'general', clipboard: '{{app}}' },
  });
  assert.ok(rendered.ok);
  assert.equal(rendered.value.prompt, 'In Slack (general), given clipboard "{{app}}":\n\nraw {{app}} text');
});

test('a missing variable renders empty, an unknown placeholder is left alone', () => {
  const rendered = renderPrompt({ action: 'custom', text: 'x', template: '[{{app}}][{{nope}}]' });
  assert.ok(rendered.ok);
  assert.equal(rendered.value.prompt, '[][{{nope}}]');
});

test('a custom template needs no instruction even though custom normally does', () => {
  assert.ok(renderPrompt({ action: 'custom', text: 'x', template: 'Do a thing with {{text}}' }).ok);
  assert.ok(!renderPrompt({ action: 'custom', text: 'x' }).ok);
});

test('custom prompts merge into the palette without colliding with built-ins', () => {
  const prompt = {
    id: 'abc',
    label: 'Bug report',
    group: 'Standups',
    template: 'Bug: {{text}}',
    appId: 'jira' as const,
    createdAt: 0,
    updatedAt: 0,
  };
  const merged = mergeCommands([prompt]);
  assert.equal(merged.length, COMMANDS.length + 1);
  const custom = merged.find((command) => command.id === 'custom:abc');
  assert.equal(custom?.template, 'Bug: {{text}}');
  assert.equal(custom?.action, 'custom');
  // Searchable by the same path as everything else.
  assert.equal(filterCommands('bug report', merged)[0]?.id, 'custom:abc');
});

test('suggestions put an app-tagged user prompt ahead of the built-ins', () => {
  const prompt = {
    id: 'abc',
    label: 'Jira triage',
    group: 'Custom',
    template: '{{text}}',
    appId: 'jira' as const,
    createdAt: 0,
    updatedAt: 0,
  };
  const merged = mergeCommands([prompt]);
  const context = {
    appId: 'jira' as const,
    label: 'Jira',
    appName: 'firefox',
    windowTitle: 'Jira',
    domain: 'atlassian.net',
    isBrowser: true,
    suggestedCommandIds: ['jira-comment', 'nope', 'jira-comment'],
  };
  const suggested = suggestedFor(context, merged, [prompt]).map((command) => command.id);
  // Unknown ids dropped, duplicates collapsed, user prompt first.
  assert.deepEqual(suggested, ['custom:abc', 'jira-comment']);

  assert.deepEqual(suggestedFor(null, merged, [prompt]), []);
  // A prompt tagged for another app drops out; the detected suggestions stay.
  assert.deepEqual(
    suggestedFor({ ...context, appId: 'slack' }, merged, [prompt]).map((command) => command.id),
    ['jira-comment'],
  );
});
