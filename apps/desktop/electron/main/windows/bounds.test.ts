import assert from 'node:assert/strict';
import { test } from 'vitest';
import { fitToWorkArea } from './bounds.js';

const PRIMARY = { x: 0, y: 27, width: 1_920, height: 1_053 };

test('leaves bounds that already fit alone', () => {
  const bounds = { x: 100, y: 120, width: 1_040, height: 720 };
  assert.deepEqual(fitToWorkArea(bounds, PRIMARY), bounds);
});

test('pulls a window saved on a monitor that is gone back onto the display', () => {
  // Saved on a second screen to the right that is no longer connected.
  const fitted = fitToWorkArea({ x: 2_400, y: 300, width: 1_040, height: 720 }, PRIMARY);
  assert.deepEqual(fitted, { x: 880, y: 300, width: 1_040, height: 720 });
});

test('shrinks to a display smaller than the saved size and keeps the panel clear', () => {
  const fitted = fitToWorkArea(
    { x: -50, y: 0, width: 1_600, height: 1_200 },
    { x: 0, y: 40, width: 1_366, height: 728 },
  );
  assert.deepEqual(fitted, { x: 0, y: 40, width: 1_366, height: 728 });
});
