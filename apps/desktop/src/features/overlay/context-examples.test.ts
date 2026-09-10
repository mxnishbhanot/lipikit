import { describe, expect, it } from 'vitest';
import type { AppContext } from '@lipikit/shared';
import { examplesFor, tuningFor } from './context-examples.js';

const context = (appId: AppContext['appId']): AppContext => ({
  appId,
  label: appId ?? 'Unknown app',
  appName: appId,
  windowTitle: null,
  platform: 'linux',
  browserDomain: null,
  isBrowser: false,
  suggestedCommandIds: [],
  timestamp: 0,
});

describe('context examples', () => {
  it('gives the detected app its own examples', () => {
    expect(examplesFor(context('vscode'))).toContain('Explain the selected error');
    expect(examplesFor(context('github'))).toContain('Write the PR description');
  });

  it('falls back to generic examples for an unknown or missing context', () => {
    const fallback = examplesFor(null);
    expect(fallback.length).toBeGreaterThan(0);
    expect(examplesFor(context(null))).toEqual(fallback);
  });

  it('never returns an empty list, whatever it is given', () => {
    for (const app of ['slack', 'jira', 'gmail', null] as const) {
      expect(examplesFor(context(app)).length, String(app)).toBeGreaterThan(0);
    }
  });

  it('has a tuning line only for a recognised app', () => {
    expect(tuningFor(context('slack'))).toBe('Friendly team reply');
    expect(tuningFor(context(null))).toBeNull();
    expect(tuningFor(null)).toBeNull();
  });
});
