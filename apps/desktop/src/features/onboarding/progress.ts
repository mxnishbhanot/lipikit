import type { Platform, ProviderId } from '@ai-anywhere/shared';

/**
 * The wizard's order, as data. The shell renders `STEPS[index]` and the dots
 * count `STEPS.length`, so adding a screen is one entry here rather than a
 * number repeated in three places.
 */
export const STEPS = ['welcome', 'platform', 'provider', 'api-key', 'model', 'permissions', 'demo'] as const;

export type StepId = (typeof STEPS)[number];

/** Everything the wizard has collected so far. */
export interface OnboardingDraft {
  readonly platform: Platform | null;
  readonly providerId: ProviderId | null;
  /** True once a key is stored for the chosen provider, or none is needed. */
  readonly keyReady: boolean;
  readonly model: string | null;
  /** The accelerator currently saved; empty means the popup has no door. */
  readonly hotkey: string;
}

/**
 * Whether the Continue button is live on a step. A guard per step rather than
 * one "is everything set" check: the user should be blocked by the screen they
 * are on, not by a field three screens back.
 */
export function canAdvance(step: StepId, draft: OnboardingDraft): boolean {
  switch (step) {
    case 'welcome':
      return true;
    case 'platform':
      return draft.platform !== null;
    case 'provider':
      return draft.providerId !== null;
    case 'api-key':
      return draft.keyReady;
    case 'model':
      return draft.model !== null;
    case 'permissions':
      // A blank global hotkey means no way into the popup at all, which is the
      // one setting the app cannot ship without.
      return draft.hotkey.trim().length > 0;
    case 'demo':
      // The demo is a showcase, not a gate: someone offline still finishes.
      return true;
  }
}
