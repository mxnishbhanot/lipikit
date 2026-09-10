import {
  appError,
  err,
  IPC_EVENTS,
  ok,
  type CapturedSelection,
  type Logger,
  type OverlayMode,
  type ReplaceSelectionRequest,
  type Result,
} from '@lipikit/shared';
import type { CursorService, TextReplacementService } from '@lipikit/platform';
import type { AppContextService, TextCaptureService } from '@lipikit/context-engine';
import type { WindowManager } from '../windows/window-manager.js';

/** Which accelerator fired, and therefore which screen the popup opens on. */
export interface HotkeyPress {
  readonly accelerator: string;
  readonly mode: OverlayMode;
  /** Command the renderer should run on arrival; only `quick-prompt` sets it. */
  readonly commandId?: string | null;
}

/**
 * The Phase 2 user journey, in one place:
 *
 *   hotkey -> capture the selection -> open the popup at the cursor ->
 *   (renderer edits/rewrites) -> replace the highlighted text
 *
 * It lives in main rather than in a package because it is the only thing that
 * needs to sequence OS services *and* windows. The ordering constraints are
 * the whole reason it exists:
 *
 *  - capture happens while the target app still has focus, so the overlay is
 *    shown only after the text is in hand;
 *  - the overlay is hidden before replacing, because hiding it is what gives
 *    focus back to the target app.
 */
export interface SelectionFlow {
  /** Bound to a global shortcut. Never throws; reports through events. */
  onHotkey(press: HotkeyPress): Promise<void>;
  capture(): Promise<Result<CapturedSelection>>;
  replace(request: ReplaceSelectionRequest): Promise<Result<void>>;
  dismiss(): Result<void>;
}

export interface SelectionFlowDeps {
  readonly capture: TextCaptureService;
  readonly context: AppContextService;
  readonly replacement: TextReplacementService;
  readonly cursor: CursorService;
  readonly windows: WindowManager;
  readonly logger: Logger;
}

export function createSelectionFlow(deps: SelectionFlowDeps): SelectionFlow {
  const scoped = deps.logger.child('flow');
  // Guards against a held-down hotkey queueing several capture passes, each
  // fighting the others over the clipboard.
  let inFlight = false;
  // Which screen the visible popup is on, so a second press of the *same*
  // hotkey dismisses it while the other one switches to its own mode.
  let currentMode: OverlayMode | null = null;

  return {
    async onHotkey(press) {
      // Second press of the same hotkey while the popup is open means "go away".
      if (deps.windows.isOverlayVisible()) {
        if (currentMode === press.mode) {
          deps.windows.hideOverlay();
          currentMode = null;
          return;
        }
        // The other hotkey: keep the captured text, just change screens.
        currentMode = press.mode;
        deps.windows.broadcast(IPC_EVENTS.hotkeyTriggered, press);
        return;
      }
      if (inFlight) {
        scoped.debug('hotkey ignored; capture already running');
        return;
      }
      inFlight = true;
      try {
        const startedAt = Date.now();
        const point = deps.cursor.getCursorPoint();
        // Both must run before the overlay is shown, because showing it makes
        // *us* the foreground window and the answer would then be "AI
        // Anywhere". They are independent reads of the same window, so they
        // run together rather than adding two shell-outs of latency.
        const [captured, context] = await Promise.all([
          deps.capture.captureSelection(),
          deps.context.detect(),
        ]);
        await deps.windows.showOverlayAt(point);
        // The number the popup target is measured against: hotkey press to a
        // visible window, capture included.
        scoped.debug('overlay shown', { ms: Date.now() - startedAt });
        currentMode = press.mode;
        // Broadcast after the window exists: on the very first press there is
        // no renderer yet, so announcing the mode any earlier reaches nobody.
        deps.windows.broadcast(IPC_EVENTS.hotkeyTriggered, press);
        deps.windows.broadcast(IPC_EVENTS.contextDetected, context);
        if (captured.ok) {
          deps.windows.broadcast(IPC_EVENTS.selectionCaptured, captured.value);
        } else {
          // Still open the popup: it is where the user reads why nothing was
          // captured, and it lets them paste text in by hand.
          scoped.warn('capture failed', { reason: captured.error.message });
          deps.windows.broadcast(IPC_EVENTS.selectionCaptureFailed, captured.error);
        }
      } catch (cause) {
        scoped.error('hotkey flow threw', { cause: String(cause) });
      } finally {
        inFlight = false;
      }
    },

    capture: () => deps.capture.captureSelection(),

    async replace(request) {
      if (request.text.trim().length === 0) {
        return err(appError('VALIDATION', 'Nothing to write back'));
      }
      // Hide first, then wait for the OS to move focus: the replacement
      // service pastes into whatever is focused, and right now that is us.
      deps.windows.hideOverlay();
      currentMode = null;
      const result = await deps.replacement.replaceSelection(request.text, request.target);
      if (!result.ok) {
        scoped.warn('replacement failed', { reason: result.error.message });
      }
      return result;
    },

    dismiss() {
      deps.windows.hideOverlay();
      currentMode = null;
      return ok(undefined);
    },
  };
}
