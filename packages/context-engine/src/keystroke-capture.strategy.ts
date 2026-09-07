import type { KeystrokeService, SelectionService } from '@ai-anywhere/platform';
import type { CaptureStrategy } from './contracts.js';

/**
 * The strategy that makes the product work the way it is described: the user
 * highlights text in someone else's app, presses the hotkey, and never
 * touches Ctrl+C themselves. It sits ahead of the clipboard strategy, which
 * stays as the fallback for sessions where no key injector exists (bare
 * Wayland without ydotool) — there, "copy it first" is the only thing left.
 */
export function createKeystrokeCaptureStrategy(deps: {
  selection: SelectionService;
  keystroke: KeystrokeService;
}): CaptureStrategy {
  return {
    id: 'keystroke',
    async isAvailable() {
      return (await deps.keystroke.backend()) !== 'none';
    },
    capture: () => deps.selection.captureSelection(),
  };
}
