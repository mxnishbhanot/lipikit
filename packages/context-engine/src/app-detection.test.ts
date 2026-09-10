import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SelectionSource } from '@lipikit/shared';
import { createAppContextService, detectApp, routeCommandId } from './app-detection.js';

const source = (
  appName: string | null,
  windowTitle: string | null,
  platform: SelectionSource['platform'] = 'linux',
): SelectionSource => ({
  appName,
  windowTitle,
  windowId: null,
  platform,
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
  assert.equal(gmail.browserDomain, 'mail.google.com');
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
  assert.equal(bare.browserDomain, null);

  const hosted = detectApp(source('firefox', 'Docs — example.dev'));
  assert.equal(hosted.browserDomain, 'example.dev');
});

test('unknown and empty sources degrade instead of throwing', () => {
  const unknown = detectApp(source('some-editor', 'untitled'));
  assert.equal(unknown.appId, null);
  assert.equal(unknown.label, 'some-editor');
  assert.ok(unknown.suggestedCommandIds.length > 0);

  const nothing = detectApp(null);
  assert.equal(nothing.appId, null);
  assert.equal(nothing.label, 'Unknown app');
  assert.equal(nothing.browserDomain, null);
});

test('the service just wraps the OS read', async () => {
  const service = createAppContextService({
    getActiveWindow: () => Promise.resolve(source('slack', 'Slack')),
  });
  assert.equal((await service.detect()).appId, 'slack');
});

test('Windows process names are recognised with their .exe suffix', () => {
  const windows: readonly [string, string | null][] = [
    ['Slack.exe', 'slack'],
    ['chrome.exe', 'chrome'],
    ['firefox.exe', 'firefox'],
    ['Code.exe', 'vscode'],
    ['Cursor.exe', 'cursor'],
    ['Teams.exe', 'teams'],
    ['Discord.exe', 'discord'],
    ['Outlook.exe', 'outlook'],
  ];
  for (const [process, expected] of windows) {
    // No title: the process name has to carry the whole decision.
    assert.equal(detectApp(source(process, null, 'win32')).appId, expected, process);
  }
});

test('GitHub is detected and routed to the PR prompt', () => {
  const pr = detectApp(source('google-chrome', 'Fix login by me · Pull Request #12 · acme/app · GitHub'));
  assert.equal(pr.appId, 'github');
  assert.equal(pr.browserDomain, 'github.com');
  assert.equal(pr.isBrowser, true);
  assert.equal(routeCommandId(pr), 'pr-description');
});

test('a host in the title identifies the site when the product name is absent', () => {
  const gh = detectApp(source('firefox', 'acme/app: nothing to see — github.com'));
  assert.equal(gh.appId, 'github');

  const jira = detectApp(source('chrome.exe', 'ABC-12 — acme.atlassian.net', 'win32'));
  assert.equal(jira.appId, 'jira');

  const slack = detectApp(source('firefox', 'Acme — app.slack.com'));
  assert.equal(slack.appId, 'slack');
});

test('the context object carries platform and the read time', () => {
  const context = detectApp(source('Slack.exe', 'general - Acme - Slack', 'win32'), 1234);
  assert.equal(context.appName, 'Slack.exe');
  assert.equal(context.platform, 'win32');
  assert.equal(context.windowTitle, 'general - Acme - Slack');
  // Native Slack, not a Slack tab: there is no browser domain to report.
  assert.equal(context.browserDomain, null);
  assert.equal(context.timestamp, 1234);
  // Nothing readable at all: still a whole object, just an empty one.
  assert.equal(detectApp(null, 7).platform, null);
  assert.equal(detectApp(null, 7).timestamp, 7);
});

test('every app routes to its own prompt', () => {
  const routes: readonly [SelectionSource, string][] = [
    [source('slack', 'Slack'), 'slack-update'],
    [source('firefox', '[ABC-1] thing - Jira'), 'jira-comment'],
    [source('chrome.exe', 'Pull Request #1 · GitHub', 'win32'), 'pr-description'],
    [source('google-chrome', 'Inbox - Gmail'), 'email'],
    [source('firefox', 'Feed | LinkedIn'), 'professional'],
    [source('Code.exe', 'index.ts - repo - Visual Studio Code', 'win32'), 'commit-message'],
  ];
  for (const [window, commandId] of routes) {
    assert.equal(routeCommandId(detectApp(window)), commandId, window.windowTitle ?? '');
  }
  // Unrecognised app still routes somewhere rather than to nothing.
  assert.equal(routeCommandId(detectApp(source('nethack', 'dungeon'))), 'improve-english');
  assert.equal(routeCommandId(null), null);
});
