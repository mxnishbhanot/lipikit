import { describe, expect, it } from 'vitest';
import { canAdvance, STEPS, type OnboardingDraft } from './progress.js';

const empty: OnboardingDraft = {
  platform: null,
  providerId: null,
  keyReady: false,
  model: null,
  hotkey: '',
};

const full: OnboardingDraft = {
  platform: 'linux',
  providerId: 'openai',
  keyReady: true,
  model: 'gpt-5-mini',
  hotkey: 'Control+Space',
};

describe('canAdvance', () => {
  it('never blocks the screens that only inform', () => {
    expect(canAdvance('welcome', empty)).toBe(true);
    expect(canAdvance('demo', empty)).toBe(true);
  });

  it('blocks every choice step until its own field is filled', () => {
    const blocked = STEPS.filter((step) => !canAdvance(step, empty));
    expect(blocked).toEqual(['platform', 'provider', 'api-key', 'model', 'permissions']);
  });

  it('passes every step once the draft is complete', () => {
    expect(STEPS.every((step) => canAdvance(step, full))).toBe(true);
  });

  it('treats a whitespace-only hotkey as unset', () => {
    expect(canAdvance('permissions', { ...full, hotkey: '  ' })).toBe(false);
  });
});
