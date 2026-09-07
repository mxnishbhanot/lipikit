import { HOTKEY_SERVICE } from '@ai-anywhere/platform';
import { ok, type Container, type OverlayMode, type Result } from '@ai-anywhere/shared';
import { LOGGER, SELECTION_FLOW } from '../tokens.js';

/**
 * Binding the global shortcut is needed in two places — at startup, and again
 * whenever the user changes the accelerator in settings — so the "unregister
 * the old one first" step lives here instead of being written twice and
 * forgotten once.
 *
 * Module-level state, deliberately: there is exactly one main process and a
 * fixed set of global shortcuts, and a container token per string would be
 * ceremony. Keyed by mode, because each mode owns one accelerator and
 * rebinding one must not disturb the other.
 */
const bound = new Map<OverlayMode, string>();

const makeHandler = (container: Container, accelerator: string, mode: OverlayMode) => (): void => {
  void container.resolve(SELECTION_FLOW).onHotkey({ accelerator, mode });
};

export function bindGlobalHotkey(
  container: Container,
  accelerator: string,
  mode: OverlayMode = 'palette',
): Result<void> {
  const hotkey = container.resolve(HOTKEY_SERVICE);
  const previous = bound.get(mode) ?? null;

  if (previous === accelerator && hotkey.isRegistered(accelerator)) return ok(undefined);
  if (previous !== null) hotkey.unregister(previous);

  const result = hotkey.register(accelerator, makeHandler(container, accelerator, mode));
  if (result.ok) {
    bound.set(mode, accelerator);
    return result;
  }

  // A refused accelerator (another app owns the combo, or the compositor eats
  // it) must not leave the app with no hotkey at all: put the working one
  // back and let the caller surface the error.
  container
    .resolve(LOGGER)
    .child('hotkey')
    .warn('hotkey unavailable', { accelerator, mode, reason: result.error.message });
  bound.delete(mode);
  if (previous !== null && hotkey.register(previous, makeHandler(container, previous, mode)).ok) {
    bound.set(mode, previous);
  }
  return result;
}

/** Shutdown/test seam: forget what we think is registered. */
export function resetHotkeyBinding(): void {
  bound.clear();
}
