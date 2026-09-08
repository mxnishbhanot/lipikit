import { describe, expect, it } from 'vitest';
import { SHORTCUTS, isHelpKey } from './shortcut-keys.js';
import { filterSettingsPages, isSettingsPageName } from '../features/settings/pages.js';

const key = (init: KeyboardEventInit & { target?: HTMLElement }): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', init);
  if (init.target) Object.defineProperty(event, 'target', { value: init.target });
  return event;
};

const field = (tag: 'input' | 'textarea' | 'div'): HTMLElement => document.createElement(tag);

describe('isHelpKey', () => {
  it('accepts F1 and Ctrl+/ even while a field has focus', () => {
    expect(isHelpKey(key({ key: 'F1', target: field('input') }))).toBe(true);
    expect(isHelpKey(key({ key: '/', ctrlKey: true, target: field('textarea') }))).toBe(true);
    expect(isHelpKey(key({ key: '/', metaKey: true }))).toBe(true);
  });

  it('accepts a bare ? only outside a text field', () => {
    expect(isHelpKey(key({ key: '?', target: field('div') }))).toBe(true);
    expect(isHelpKey(key({ key: '?', target: field('input') }))).toBe(false);
    expect(isHelpKey(key({ key: '?', target: field('textarea') }))).toBe(false);
  });

  it('ignores unrelated keys and modifier variants', () => {
    expect(isHelpKey(key({ key: '/' }))).toBe(false);
    expect(isHelpKey(key({ key: 'F1', altKey: true }))).toBe(false);
    expect(isHelpKey(key({ key: 'k', ctrlKey: true }))).toBe(false);
  });
});

describe('SHORTCUTS', () => {
  it('documents both scopes', () => {
    expect(SHORTCUTS.main.length).toBeGreaterThan(0);
    expect(SHORTCUTS.popup.length).toBeGreaterThan(0);
  });
});

describe('filterSettingsPages', () => {
  it('returns every page for an empty query', () => {
    expect(filterSettingsPages('   ')).toHaveLength(9);
  });

  it('matches keywords, not only titles', () => {
    expect(filterSettingsPages('api key').map((page) => page.name)).toEqual(['Providers']);
    expect(filterSettingsPages('TELEMETRY').map((page) => page.name)).toEqual(['Privacy']);
  });

  it('returns nothing when there is no match', () => {
    expect(filterSettingsPages('bluetooth')).toHaveLength(0);
  });
});

describe('isSettingsPageName', () => {
  it('rejects a page name that no longer exists', () => {
    expect(isSettingsPageName('General')).toBe(true);
    expect(isSettingsPageName('Prompts')).toBe(false);
    expect(isSettingsPageName(null)).toBe(false);
  });
});
