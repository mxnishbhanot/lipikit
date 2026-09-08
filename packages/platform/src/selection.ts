import { appError, err, ok, type CapturedSelection, type Logger } from '@ai-anywhere/shared';
import type {
  ActiveWindowService,
  ClipboardService,
  KeystrokeService,
  SelectionService,
  TextReplacementService,
} from './contracts.js';
import { delay } from './command.js';

export interface SelectionTiming {
  /**
   * How long to wait for the target app to answer Ctrl+C / act on Ctrl+V.
   * Calibration knob, not a constant: a local editor answers in ~40ms, a
   * loaded Electron app or an RDP session can need 250ms+.
   */
  readonly settleMs: number;
}

export interface SelectionDeps {
  readonly clipboard: ClipboardService;
  readonly keystroke: KeystrokeService;
  readonly activeWindow: ActiveWindowService;
  readonly logger: Logger;
  readonly timing: SelectionTiming;
}

/**
 * Poll rather than sleep once: fast apps answer immediately, slow ones get
 * time. The waits escalate as fractions of settleMs so a local editor that
 * answers in ~15ms is not held for the full calibration wait, while a slow
 * app still gets the same total budget it had before (4x settleMs).
 */
const POLL_FRACTIONS = [0.125, 0.375, 1, 2.5] as const;

/**
 * Copy-out. The sequence matters and every step is there for a reason:
 *
 *  1. snapshot the clipboard  — it gets handed back untouched, always
 *  2. clear the clipboard     — an empty read afterwards then means
 *                               "nothing was selected", which comparing
 *                               against the old content cannot tell you when
 *                               the user selected the same text they copied
 *                               five minutes ago
 *  3. inject Ctrl+C
 *  4. poll for content        — apps fill the clipboard asynchronously
 *  5. restore the snapshot    — before returning, on every path
 */
export function createSelectionService(deps: SelectionDeps): SelectionService {
  const scoped = deps.logger.child('selection');

  return {
    async captureSelection() {
      // Started now, awaited later: the foreground window cannot change while
      // we hold the keyboard, and on Windows this costs a PowerShell spawn.
      const sourcePromise = deps.activeWindow.getActiveWindow();

      let original = '';
      try {
        original = await deps.clipboard.readText();
      } catch (cause) {
        scoped.warn('clipboard snapshot failed; capture will restore to empty', {
          cause: String(cause),
        });
      }

      const restore = async (): Promise<void> => {
        try {
          await deps.clipboard.writeText(original);
        } catch {
          scoped.warn('clipboard restore failed');
        }
      };

      try {
        await deps.clipboard.writeText('');
      } catch (cause) {
        return err(appError('UNKNOWN', 'Could not prepare the clipboard for capture', cause));
      }

      const sent = await deps.keystroke.sendCopy();
      if (!sent.ok) {
        await restore();
        return err(sent.error);
      }

      let text = '';
      for (const [attempt, fraction] of POLL_FRACTIONS.entries()) {
        if (text.length > 0) break;
        await delay(Math.max(1, Math.round(deps.timing.settleMs * fraction)));
        try {
          text = await deps.clipboard.readText();
        } catch (cause) {
          scoped.warn('clipboard read failed during capture', { attempt, cause: String(cause) });
        }
      }

      await restore();

      if (text.trim().length === 0) {
        return err(
          appError(
            'VALIDATION',
            'No text selected — highlight something first, or raise AI_ANYWHERE_INPUT_SETTLE_MS if the app is slow',
          ),
        );
      }

      const source = await sourcePromise;
      scoped.debug('captured selection', { chars: text.length, app: source.appName });
      const selection: CapturedSelection = { text, source, capturedAt: Date.now() };
      return ok(selection);
    },
  };
}

/**
 * Paste-in. Refocusing the source window is best-effort by necessity —
 * Wayland gives no client-to-client activation at all — so the caller is
 * expected to have hidden the overlay first, which is what actually returns
 * focus on Windows and on Wayland.
 */
export function createTextReplacementService(deps: SelectionDeps): TextReplacementService {
  const scoped = deps.logger.child('replacement');

  return {
    async replaceSelection(text, target) {
      if (text.length === 0) {
        return err(appError('VALIDATION', 'Refusing to replace a selection with empty text'));
      }

      if (target?.windowId) {
        const focused = await deps.keystroke.focusWindow(target.windowId);
        if (!focused.ok) {
          // Expected on Wayland and with nut.js; the paste still usually lands
          // because the overlay gave focus back when it hid.
          scoped.debug('window refocus unavailable', { reason: focused.error.message });
        }
      }
      // Unconditional: whether we raised the window ourselves or the desktop
      // did it when the overlay hid, focus moves asynchronously, and pasting
      // before it lands types into the popup we just closed.
      await delay(deps.timing.settleMs);

      return deps.clipboard.withPreservedClipboard(async () => {
        try {
          await deps.clipboard.writeText(text);
        } catch (cause) {
          return err(appError('UNKNOWN', 'Could not write the rewrite to the clipboard', cause));
        }
        // Some clipboard owners (Wayland) publish asynchronously; pasting in
        // the same tick can paste the previous content.
        await delay(deps.timing.settleMs);

        const pasted = await deps.keystroke.sendPaste();
        if (!pasted.ok) return err(pasted.error);

        // Hold the text on the clipboard until the target app has read it —
        // withPreservedClipboard restores the user's content the moment this
        // returns, and a fast restore beats a slow paste.
        await delay(deps.timing.settleMs);
        scoped.debug('replaced selection', { chars: text.length });
        return ok(undefined);
      });
    },
  };
}
