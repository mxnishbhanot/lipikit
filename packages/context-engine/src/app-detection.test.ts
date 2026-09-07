import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SelectionSource } from '@ai-anywhere/shared';
import { createAppContextService, detectApp } from './app-detection.js';

const source = (appName: string | null, windowTitle: string | null): SelectionSource => ({
  appName,
  windowTitle,
  windowId: null,
  platform: 'linux',
});

test('recognises native apps by process name', () => {
  assert.equal(detectApp(source('slack', 'general (12) - Acme - Slack')).appId, 'slack');
  assert.equal(detectApp(source('discord', 'general')).appId, 'discord');
  assert.equal(detectApp(source('Code', 'index.ts - project')).appId, 'vscode');
  assert.equal(detectApp(source('OUTLOOK.EXE', 'Inbox')).appId, 'outlook');
});

test('a web app in a browser beats the browser itself', () => {
  const gmail = detectApp(source('google-chrome', 'Inbox (5) - me@x.com - Gmail - Google Chrome'));
  assert.equal(gmail.appId, 'gmail');
  assert.equal(gmail.domain, 'mail.google.com');
  assert.equal(gmail.isBrowser, true);

  const jira = detectApp(source('firefox', '[ABC-12] Fix login - Jira — Mozilla Firefox'));
  assert.equal(jira.appId, 'jira');
  assert.equal(jira.suggestedCommandIds[0], 'jira-comment');
});

test('Cursor is not mistaken for VS Code', () => {
  assert.equal(detectApp(source('Cursor', 'main.rs - repo - Cursor')).appId, 'cursor');
});

test('a plain browser window reports a domain only if the title carries one', () => {
  const bare = detectApp(source('firefox', 'Some Article — Mozilla Firefox'));
  assert.equal(bare.appId, 'firefox');
  assert.equal(bare.isBrowser, true);
  assert.equal(bare.domain, null);

  const hosted = detectApp(source('firefox', 'Docs — example.dev'));
  assert.equal(hosted.domain, 'example.dev');
});

test('unknown and empty sources degrade instead of throwing', () => {
  const unknown = detectApp(source('some-editor', 'untitled'));
  assert.equal(unknown.appId, null);
  assert.equal(unknown.label, 'some-editor');
  assert.ok(unknown.suggestedCommandIds.length > 0);

  const nothing = detectApp(null);
  assert.equal(nothing.appId, null);
  assert.equal(nothing.label, 'Unknown app');
  assert.equal(nothing.domain, null);
});

test('the service just wraps the OS read', async () => {
  const service = createAppContextService({
    getActiveWindow: () => Promise.resolve(source('slack', 'Slack')),
  });
  assert.equal((await service.detect()).appId, 'slack');
});
