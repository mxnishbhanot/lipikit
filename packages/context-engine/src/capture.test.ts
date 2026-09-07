import assert from 'node:assert/strict';
import { test } from 'vitest';
import { appError, err, ok, type CapturedSelection, type Logger } from '@ai-anywhere/shared';
import { createTextCaptureService } from './capture.service.js';
import type { CaptureStrategy } from './contracts.js';

const silent = (): Logger => {
  const logger: Logger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    child: () => logger,
  };
  return logger;
};

const selection = (text: string): CapturedSelection => ({
  text,
  source: { windowTitle: null, appName: null, windowId: null, platform: 'linux' },
  capturedAt: 0,
});

const strategy = (
  id: CaptureStrategy['id'],
  options: { available: boolean; text?: string },
  log: string[],
): CaptureStrategy => ({
  id,
  async isAvailable() {
    log.push(`available?${id}`);
    return options.available;
  },
  async capture() {
    log.push(`capture:${id}`);
    return options.text === undefined
      ? err(appError('VALIDATION', `${id} found nothing`))
      : ok(selection(options.text));
  },
});

test('keystroke capture wins when available', async () => {
  const log: string[] = [];
  const service = createTextCaptureService(
    [
      strategy('keystroke', { available: true, text: 'from selection' }, log),
      strategy('clipboard', { available: true, text: 'from clipboard' }, log),
    ],
    silent(),
  );

  const result = await service.captureSelection();
  assert.ok(result.ok && result.value.text === 'from selection');
  assert.deepEqual(log, ['available?keystroke', 'capture:keystroke'], 'must not touch the fallback');
});

test('an unavailable injector falls through to the clipboard', async () => {
  const log: string[] = [];
  const service = createTextCaptureService(
    [
      // Bare Wayland with no ydotool: nothing can inject Ctrl+C, so "copy it
      // yourself first" is the only route left.
      strategy('keystroke', { available: false }, log),
      strategy('clipboard', { available: true, text: 'from clipboard' }, log),
    ],
    silent(),
  );

  const result = await service.captureSelection();
  assert.ok(result.ok && result.value.text === 'from clipboard');
  assert.deepEqual(log, ['available?keystroke', 'available?clipboard', 'capture:clipboard']);
});

test('a failing injector falls through, and the last error is reported', async () => {
  const log: string[] = [];
  const service = createTextCaptureService(
    [strategy('keystroke', { available: true }, log), strategy('clipboard', { available: true }, log)],
    silent(),
  );

  const result = await service.captureSelection();
  assert.ok(!result.ok);
  assert.match(result.error.message, /clipboard found nothing/);
  assert.deepEqual(log, [
    'available?keystroke',
    'capture:keystroke',
    'available?clipboard',
    'capture:clipboard',
  ]);
});
