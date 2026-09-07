import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createKeystrokeService } from './keystroke.js';
import { fakeCommands, silentLogger } from './test-doubles.js';

test('X11 sessions use xdotool with cleared modifiers', async () => {
  const commands = fakeCommands({ available: ['xdotool', 'ydotool'] });
  const service = createKeystrokeService(
    { platform: 'linux', displayServer: 'x11' },
    commands,
    silentLogger(),
  );

  assert.equal(await service.backend(), 'xdotool');
  assert.ok((await service.sendCopy()).ok);
  assert.ok((await service.sendPaste()).ok);
  // --clearmodifiers matters: the user is still holding the hotkey's Ctrl.
  assert.deepEqual(commands.calls, [
    'xdotool key --clearmodifiers ctrl+c',
    'xdotool key --clearmodifiers ctrl+v',
  ]);
});

test('Wayland sessions use ydotool key codes', async () => {
  const commands = fakeCommands({ available: ['ydotool'] });
  const service = createKeystrokeService(
    { platform: 'linux', displayServer: 'wayland' },
    commands,
    silentLogger(),
  );

  assert.equal(await service.backend(), 'ydotool');
  assert.ok((await service.sendCopy()).ok);
  // LEFTCTRL=29 down, C=46 down, C up, LEFTCTRL up.
  assert.deepEqual(commands.calls, ['ydotool key 29:1 46:1 46:0 29:0']);

  // No client can raise another client's window under Wayland; say so rather
  // than silently pasting into the wrong app.
  const focused = await service.focusWindow('4242');
  assert.ok(!focused.ok);
  assert.equal(focused.error.code, 'PLATFORM_UNSUPPORTED');
});

test('Wayland falls back to xdotool (XWayland) when ydotool is missing', async () => {
  const commands = fakeCommands({ available: ['xdotool'] });
  const service = createKeystrokeService(
    { platform: 'linux', displayServer: 'wayland' },
    commands,
    silentLogger(),
  );
  assert.equal(await service.backend(), 'xdotool');
});

test('a session with no injector reports it instead of failing silently', async () => {
  const commands = fakeCommands({ available: [] });
  const service = createKeystrokeService(
    { platform: 'linux', displayServer: null },
    commands,
    silentLogger(),
  );

  assert.equal(await service.backend(), 'none');
  const copied = await service.sendCopy();
  assert.ok(!copied.ok);
  assert.equal(copied.error.code, 'PLATFORM_UNSUPPORTED');
  assert.match(copied.error.message, /xdotool|ydotool/);
  assert.deepEqual(commands.calls, [], 'nothing should be spawned');
});

test('a ydotool failure explains the daemon/permission requirement', async () => {
  const commands = fakeCommands({ available: ['ydotool'], failing: ['ydotool'] });
  const service = createKeystrokeService(
    { platform: 'linux', displayServer: 'wayland' },
    commands,
    silentLogger(),
  );
  const copied = await service.sendCopy();
  assert.ok(!copied.ok);
  assert.equal(copied.error.code, 'PERMISSION_DENIED');
  assert.match(copied.error.message, /ydotoold/);
});

test('window ids are validated before reaching a shell-out', async () => {
  const commands = fakeCommands({ available: ['xdotool'] });
  const service = createKeystrokeService(
    { platform: 'linux', displayServer: 'x11' },
    commands,
    silentLogger(),
  );
  const result = await service.focusWindow('4242; rm -rf ~');
  assert.ok(!result.ok);
  assert.equal(result.error.code, 'VALIDATION');
  assert.deepEqual(commands.calls, []);
});

test('the backend is probed once and cached', async () => {
  let probes = 0;
  const commands = fakeCommands({ available: ['xdotool'] });
  const counting = {
    ...commands,
    has: async (file: string) => {
      probes += 1;
      return commands.has(file);
    },
  };
  const service = createKeystrokeService(
    { platform: 'linux', displayServer: 'x11' },
    counting,
    silentLogger(),
  );

  await service.sendCopy();
  await service.sendPaste();
  await service.backend();
  assert.equal(probes, 1, 'the hot path must not re-probe on every keystroke');
});
