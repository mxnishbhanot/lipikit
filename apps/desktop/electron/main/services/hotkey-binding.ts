import { HOTKEY_SERVICE } from '@lipikit/platform';
import { customCommandId } from '@lipikit/prompts';
import { ok, type Container, type CustomPrompt, type OverlayMode, type Result } from '@lipikit/shared';
import { LOGGER, SELECTION_FLOW } from '../tokens.js';

/**
 * Binding the global shortcut is needed in two places — at startup, and again
 * whenever the user changes the accelerator in settings — so the "unregister
 * the old one first" step lives here instead of being written twice and
 * forgotten once.
 *
 * Module-level state, deliberately: there is exactly one main process, and a
 * container token per string would be ceremony. Keyed by binding — the three
 * fixed shortcuts use their mode as the key, a user's prompt uses
 * `prompt:<id>` — because rebinding one must not disturb the others.
 */
const bound = new Map<string, string>();

/** Binding key for one of the user's prompt shortcuts. */
const promptKey = (promptId: string): string => `prompt:${promptId}`;

const makeHandler =
  (container: Container, accelerator: string, mode: OverlayMode, commandId: string | null) => (): void => {
    void container.resolve(SELECTION_FLOW).onHotkey({ accelerator, mode, commandId });
  };

/**
 * `accelerator` may be empty: every shortcut except the palette one is
 * optional, and clearing it in settings has to actually give the combination
 * back to the OS rather than leave the old one registered.
 */
export function bindGlobalHotkey(
  container: Container,
  accelerator: string,
  mode: OverlayMode = 'palette',
  commandId: string | null = null,
  key: string = mode,
): Result<void> {
  const hotkey = container.resolve(HOTKEY_SERVICE);
  const previous = bound.get(key) ?? null;

  if (accelerator.trim().length === 0) {
    if (previous !== null) hotkey.unregister(previous);
    bound.delete(key);
    return ok(undefined);
  }
  if (previous === accelerator && hotkey.isRegistered(accelerator)) return ok(undefined);
  if (previous !== null) hotkey.unregister(previous);

  const result = hotkey.register(accelerator, makeHandler(container, accelerator, mode, commandId));
  if (result.ok) {
    bound.set(key, accelerator);
    return result;
  }

  // A refused accelerator (another app owns the combo, or the compositor eats
  // it) must not leave the app with no hotkey at all: put the working one
  // back and let the caller surface the error.
  container
    .resolve(LOGGER)
    .child('hotkey')
    .warn('hotkey unavailable', { accelerator, mode, reason: result.error.message });
  bound.delete(key);
  if (previous !== null && hotkey.register(previous, makeHandler(container, previous, mode, commandId)).ok) {
    bound.set(key, previous);
  }
  return result;
}

/**
 * Binds every prompt that carries a shortcut and releases the ones that no
 * longer do — a rename, a cleared shortcut and a deleted prompt all have to
 * end with the OS holding exactly the combinations the list still asks for,
 * so this walks the whole list rather than diffing one change.
 *
 * Returns the first refusal, if any: the prompt is still saved, but the caller
 * has to be able to say the shortcut did not take.
 */
export function syncPromptHotkeys(container: Container, prompts: readonly CustomPrompt[]): Result<void> {
  const wanted = new Map(
    prompts
      .filter((prompt) => prompt.shortcut !== null && prompt.shortcut.trim().length > 0)
      .map((prompt) => [promptKey(prompt.id), prompt]),
  );

  for (const key of [...bound.keys()]) {
    if (key.startsWith('prompt:') && !wanted.has(key)) {
      bindGlobalHotkey(container, '', 'quick-prompt', null, key);
    }
  }

  let failure: Result<void> | null = null;
  for (const [key, prompt] of wanted) {
    const result = bindGlobalHotkey(
      container,
      prompt.shortcut ?? '',
      'quick-prompt',
      customCommandId(prompt.id),
      key,
    );
    if (!result.ok && failure === null) failure = result;
  }
  return failure ?? ok(undefined);
}

/** Shutdown/test seam: forget what we think is registered. */
export function resetHotkeyBinding(): void {
  bound.clear();
}
