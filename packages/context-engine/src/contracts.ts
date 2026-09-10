import type { CapturedSelection, Result } from '@lipikit/shared';

/**
 * How text gets out of a foreign application. Phase 1 ships the clipboard
 * strategy; a keystroke-injection strategy (Ctrl+C into the focused window)
 * plugs in behind the same interface without touching callers.
 */
export interface CaptureStrategy {
  readonly id: 'clipboard' | 'keystroke' | 'accessibility';
  /** False when the OS/session cannot support it (e.g. Wayland + xdotool). */
  isAvailable(): Promise<boolean>;
  capture(): Promise<Result<CapturedSelection>>;
}

export interface TextCaptureService {
  /** Tries strategies in priority order, returns the first success. */
  captureSelection(): Promise<Result<CapturedSelection>>;
}
