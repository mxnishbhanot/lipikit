import assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';
import { HOTKEY_SERVICE, type HotkeyService } from '@ai-anywhere/platform';
import { createContainer, ok, type CustomPrompt, type Logger } from '@ai-anywhere/shared';
import { bindGlobalHotkey, resetHotkeyBinding, syncPromptHotkeys } from './hotkey-binding.js';
import type { HotkeyPress, SelectionFlow } from './selection-flow.js';
import { LOGGER, SELECTION_FLOW } from '../tokens.js';

/** Records what reached the OS, so the register/unregister order is assertable. */
function harness(refuse: readonly string[] = []) {
  const registered = new Map<string, () => void>();
  const calls: string[] = [];
  const presses: unknown[] = [];

  const hotkey: HotkeyService = {
    register(accelerator, handler) {
      calls.push(`register:${accelerator}`);
      if (refuse.includes(accelerator)) return { ok: false, error: { code: 'UNKNOWN', message: 'taken' } };
      registered.set(accelerator, handler);
      return ok(undefined);
    },
    unregister(accelerator) {
      calls.push(`unregister:${accelerator}`);
      registered.delete(accelerator);
    },
    unregisterAll: () => registered.clear(),
    isRegistered: (accelerator) => registered.has(accelerator),
  };

  const noop = (): void => undefined;
  const logger = {
    child: () => logger,
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
  } as unknown as Logger;
  const container = createContainer();
  container.registerValue(HOTKEY_SERVICE, hotkey);
  container.registerValue(LOGGER, logger);
  container.registerValue(SELECTION_FLOW, {
    onHotkey: async (press: HotkeyPress) => void presses.push(press),
  } as unknown as SelectionFlow);

  return { container, registered, calls, presses };
}

afterEach(() => resetHotkeyBinding());

test('an empty accelerator unbinds the mode and registers nothing', () => {
  const { container, registered, calls } = harness();

  assert.ok(bindGlobalHotkey(container, 'Control+Shift+R', 'client-reply').ok);
  assert.ok(registered.has('Control+Shift+R'));

  assert.ok(bindGlobalHotkey(container, '', 'client-reply').ok);
  assert.equal(registered.size, 0, 'clearing must give the combination back to the OS');
  assert.deepEqual(calls, ['register:Control+Shift+R', 'unregister:Control+Shift+R']);

  // Clearing an already-unbound mode is a no-op, not a second unregister.
  assert.ok(bindGlobalHotkey(container, '   ', 'client-reply').ok);
  assert.equal(calls.length, 2);
});

test('modes bind independently and the press names the mode that fired', () => {
  const { container, registered, presses } = harness();

  assert.ok(bindGlobalHotkey(container, 'Control+Space', 'palette').ok);
  assert.ok(bindGlobalHotkey(container, 'Control+Shift+R', 'client-reply').ok);
  assert.deepEqual([...registered.keys()], ['Control+Space', 'Control+Shift+R']);

  registered.get('Control+Shift+R')?.();
  assert.deepEqual(presses, [{ accelerator: 'Control+Shift+R', mode: 'client-reply', commandId: null }]);
});

test('a refused accelerator leaves the working one bound', () => {
  const { container, registered } = harness(['Control+Alt+K']);

  assert.ok(bindGlobalHotkey(container, 'Control+Alt+J', 'client-reply').ok);
  assert.equal(bindGlobalHotkey(container, 'Control+Alt+K', 'client-reply').ok, false);
  assert.deepEqual([...registered.keys()], ['Control+Alt+J']);
});

const prompt = (id: string, shortcut: string | null): CustomPrompt => ({
  id,
  label: id,
  group: 'Custom',
  template: '{{text}}',
  appId: null,
  shortcut,
  createdAt: 0,
  updatedAt: 0,
});

test('prompt shortcuts bind, rebind and release as the list changes', () => {
  const { container, registered, presses } = harness();

  assert.ok(syncPromptHotkeys(container, [prompt('p1', 'Control+Alt+B'), prompt('p2', null)]).ok);
  assert.deepEqual([...registered.keys()], ['Control+Alt+B'], 'only the prompt with a shortcut binds');

  // Running it must reach the palette command id the prompt merges in as.
  registered.get('Control+Alt+B')?.();
  assert.deepEqual(presses, [{ accelerator: 'Control+Alt+B', mode: 'quick-prompt', commandId: 'custom:p1' }]);

  // Changed combination: the old one goes back to the OS.
  assert.ok(syncPromptHotkeys(container, [prompt('p1', 'Control+Alt+N')]).ok);
  assert.deepEqual([...registered.keys()], ['Control+Alt+N']);

  // Cleared shortcut, then a deleted prompt: both end with nothing registered.
  assert.ok(syncPromptHotkeys(container, [prompt('p1', null)]).ok);
  assert.equal(registered.size, 0);
  assert.ok(syncPromptHotkeys(container, [prompt('p1', 'Control+Alt+N')]).ok);
  assert.ok(syncPromptHotkeys(container, []).ok);
  assert.equal(registered.size, 0);
});

test('a refused prompt shortcut is reported but leaves the others bound', () => {
  const { container, registered } = harness(['Control+Alt+K']);

  const result = syncPromptHotkeys(container, [prompt('p1', 'Control+Alt+B'), prompt('p2', 'Control+Alt+K')]);
  assert.equal(result.ok, false);
  assert.deepEqual([...registered.keys()], ['Control+Alt+B']);
});

test('prompt bindings and the settings-owned shortcuts do not disturb each other', () => {
  const { container, registered } = harness();

  assert.ok(bindGlobalHotkey(container, 'Control+Space', 'palette').ok);
  assert.ok(bindGlobalHotkey(container, 'Control+Shift+R', 'client-reply').ok);
  assert.ok(syncPromptHotkeys(container, [prompt('p1', 'Control+Alt+B')]).ok);
  assert.ok(syncPromptHotkeys(container, []).ok);
  assert.deepEqual(
    [...registered.keys()],
    ['Control+Space', 'Control+Shift+R'],
    'clearing prompt shortcuts must not touch the settings-owned bindings',
  );
});
