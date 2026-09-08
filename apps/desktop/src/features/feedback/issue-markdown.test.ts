import { describe, expect, it } from 'vitest';
import { buildIssueMarkdown, emptyDraft, issueUrl } from './issue-markdown.js';

describe('buildIssueMarkdown', () => {
  it('drops empty sections and keeps the filled ones', () => {
    const markdown = buildIssueMarkdown({
      ...emptyDraft('bug'),
      title: 'Hotkey dies after suspend',
      body: 'Ctrl+Shift+Space stops opening the popup.',
      steps: '1. Suspend\n2. Resume',
      diagnostics: 'OS: linux x64',
    });
    expect(markdown).toContain('# Hotkey dies after suspend');
    expect(markdown).toContain('## Steps to reproduce');
    expect(markdown).toContain('```\nOS: linux x64\n```');
    expect(markdown).not.toContain('## Expected');
    expect(markdown).not.toContain('## Attachments');
  });

  it('omits bug-only sections from a feature request', () => {
    const markdown = buildIssueMarkdown({
      ...emptyDraft('feature'),
      body: 'Let me pin a prompt to the tray.',
      steps: 'ignored',
      expected: 'ignored',
    });
    expect(markdown).toContain('# Feature request');
    expect(markdown).toContain('## What I want');
    expect(markdown).not.toContain('ignored');
  });

  it('lists attachments by path', () => {
    const markdown = buildIssueMarkdown({
      ...emptyDraft('bug'),
      screenshotPath: '/home/u/shot.png',
      logPath: '/home/u/logs.txt',
    });
    expect(markdown).toContain('`/home/u/shot.png`');
    expect(markdown).toContain('`/home/u/logs.txt`');
  });

  it('puts the markdown in the new-issue url', () => {
    const url = issueUrl({ ...emptyDraft('feature'), title: 'Tray pin', body: 'please' });
    const params = new URL(url).searchParams;
    expect(url).toContain('/new?');
    expect(params.get('title')).toBe('Tray pin');
    expect(params.get('body')).toContain('# Tray pin');
    expect(params.get('labels')).toBe('feature');
  });
});
