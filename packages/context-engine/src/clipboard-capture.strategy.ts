import { appError, err, ok, type CapturedSelection } from '@ai-anywhere/shared';
import type { ActiveWindowService, ClipboardService } from '@ai-anywhere/platform';
import type { CaptureStrategy } from './contracts.js';

/**
 * Lowest common denominator, and the only strategy that works identically on
 * Windows, X11, and Wayland: the user copies, we read. No native module, no
 * accessibility permission.
 */
export function createClipboardCaptureStrategy(deps: {
  clipboard: ClipboardService;
  activeWindow: ActiveWindowService;
}): CaptureStrategy {
  return {
    id: 'clipboard',
    async isAvailable() {
      return true;
    },
    async capture() {
      const text = await deps.clipboard.readText();
      if (text.trim().length === 0) {
        return err(appError('VALIDATION', 'Clipboard is empty — copy some text first'));
      }
      const source = await deps.activeWindow.getActiveWindow();
      const selection: CapturedSelection = { text, source, capturedAt: Date.now() };
      return ok(selection);
    },
  };
}
