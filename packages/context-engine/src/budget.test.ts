import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateTokens, fitToBudget } from './budget.js';

test('fitToBudget keeps head and tail within the char budget', () => {
  assert.equal(fitToBudget('short', 100), 'short');
  const long = 'a'.repeat(500) + 'ZZZ';
  const fitted = fitToBudget(long, 25);
  assert.ok(fitted.length <= 100, `expected <= 100 chars, got ${fitted.length}`);
  assert.ok(fitted.startsWith('a'));
  assert.ok(fitted.endsWith('ZZZ'), 'tail must survive');
  assert.equal(estimateTokens('abcd'), 1);
});
