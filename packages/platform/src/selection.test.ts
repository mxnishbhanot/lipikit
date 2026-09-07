import assert from 'node:assert/strict';
import { test } from 'vitest';
import { appError, err } from '@ai-anywhere/shared';
import { createSelectionService, createTextReplacementService } from './selection.js';
import type { ActiveWindowService } from './contracts.js';
import { fakeClipboard, fakeCommands, fakeKeystroke, fakeSource, silentLogger } from './test-doubles.js';
import { createActiveWindowService } from './active-window.js';

const activeWindow: ActiveWindowService = { getActiveWindow: async () => fakeSource() };
const timing = { settleMs: 0 };

test('capture reads what Ctrl+C produced and hands the clipboard back', async () => {
  const clipboard = fakeClipboard('USER CLIPBOARD');
  const keystroke = fakeKeystroke({ clipboard, onCopy: 'highlighted sentence' });
  const service = createSelectionService({
    clipboard,
    keystroke,
    activeWindow,
    logger: silentLogger(),
    timing,
  });

  const result = await service.captureSelection();

  assert.ok(result.ok, 'capture should succeed');
  assert.equal(result.value.text, 'highlighted sentence');
  assert.equal(result.value.source.appName, 'slack');
  assert.equal(clipboard.current(), 'USER CLIPBOARD', 'clipboard must be restored');
  assert.deepEqual(keystroke.calls, ['copy']);
});

test('capture reports no selection when the app ignores Ctrl+C, and still restores', async () => {
  const clipboard = fakeClipboard('USER CLIPBOARD');
  // onCopy omitted: the target app does nothing, so the cleared clipboard
  // stays empty. Comparing against the old value could not detect this when
  // the user had already copied the same text.
  const keystroke = fakeKeystroke({ clipboard });
  const service = createSelectionService({
    clipboard,
    keystroke,
    activeWindow,
    logger: silentLogger(),
    timing,
  });

  const result = await service.captureSelection();

  assert.ok(!result.ok);
  assert.equal(result.error.code, 'VALIDATION');
  assert.equal(clipboard.current(), 'USER CLIPBOARD');
});

test('capture surfaces a keystroke failure without eating the clipboard', async () => {
  const clipboard = fakeClipboard('USER CLIPBOARD');
  const keystroke = fakeKeystroke({
    clipboard,
    copyResult: err(appError('PLATFORM_UNSUPPORTED', 'no injector')),
  });
  const service = createSelectionService({
    clipboard,
    keystroke,
    activeWindow,
    logger: silentLogger(),
    timing,
  });

  const result = await service.captureSelection();

  assert.ok(!result.ok);
  assert.equal(result.error.code, 'PLATFORM_UNSUPPORTED');
  assert.equal(clipboard.current(), 'USER CLIPBOARD');
});

test('replace refocuses the source window, pastes, then restores the clipboard', async () => {
  const clipboard = fakeClipboard('USER CLIPBOARD');
  const keystroke = fakeKeystroke({ clipboard });
  const service = createTextReplacementService({
    clipboard,
    keystroke,
    activeWindow,
    logger: silentLogger(),
    timing,
  });

  const result = await service.replaceSelection('rewritten text', fakeSource('4242'));

  assert.ok(result.ok);
  assert.deepEqual(keystroke.calls, ['focus:4242', 'paste']);
  assert.equal(clipboard.current(), 'USER CLIPBOARD');
  // The rewrite must be on the clipboard *before* the paste and gone after.
  const writeIndex = clipboard.log.indexOf('write:rewritten text');
  const restoreIndex = clipboard.log.lastIndexOf('write:USER CLIPBOARD');
  assert.ok(writeIndex >= 0 && restoreIndex > writeIndex, clipboard.log.join(' | '));
});

test('replace still runs when the window cannot be refocused (Wayland)', async () => {
  const clipboard = fakeClipboard();
  const keystroke = fakeKeystroke({
    clipboard,
    focusResult: err(appError('PLATFORM_UNSUPPORTED', 'no activation on Wayland')),
  });
  const service = createTextReplacementService({
    clipboard,
    keystroke,
    activeWindow,
    logger: silentLogger(),
    timing,
  });

  const result = await service.replaceSelection('rewritten', fakeSource(null));

  assert.ok(result.ok, 'a failed refocus must not abort the paste');
  assert.deepEqual(keystroke.calls, ['paste'], 'no windowId means no focus attempt');
});

test('replace refuses empty text and reports a failed paste', async () => {
  const clipboard = fakeClipboard();
  const failing = fakeKeystroke({
    clipboard,
    pasteResult: err(appError('PERMISSION_DENIED', 'ydotool not permitted')),
  });
  const service = createTextReplacementService({
    clipboard,
    keystroke: failing,
    activeWindow,
    logger: silentLogger(),
    timing,
  });

  const blank = await service.replaceSelection('', null);
  assert.ok(!blank.ok);
  assert.equal(blank.error.code, 'VALIDATION');

  const denied = await service.replaceSelection('text', null);
  assert.ok(!denied.ok);
  assert.equal(denied.error.code, 'PERMISSION_DENIED');
  assert.equal(clipboard.current(), 'USER CLIPBOARD', 'a failed paste still restores');
});

test('active window parses the xdotool triple and degrades to nulls', async () => {
  const commands = fakeCommands({
    available: ['xdotool'],
    stdout: { xdotool: '77\n' },
  });
  const service = createActiveWindowService({ platform: 'linux', displayServer: 'x11' }, commands);
  const source = await service.getActiveWindow();
  assert.equal(source.windowId, '77');
  assert.equal(source.platform, 'linux');

  // Wayland has no way to ask, so every field is null rather than invented.
  const wayland = createActiveWindowService({ platform: 'linux', displayServer: 'wayland' }, commands);
  assert.deepEqual(await wayland.getActiveWindow(), {
    windowTitle: null,
    appName: null,
    windowId: null,
    platform: 'linux',
  });
});
