import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderPrompt } from './render.js';

test('renderPrompt substitutes placeholders and validates input', () => {
  const rewritten = renderPrompt({ action: 'rewrite', text: 'hello', tone: 'formal' });
  assert.ok(rewritten.ok);
  assert.match(rewritten.value.prompt, /formal, professional tone/);
  assert.match(rewritten.value.prompt, /hello/);
  assert.ok(!rewritten.value.prompt.includes('{{'), 'no placeholder may survive');

  assert.equal(renderPrompt({ action: 'rewrite', text: '   ' }).ok, false);
  assert.equal(renderPrompt({ action: 'translate', text: 'hi' }).ok, false);
  assert.equal(renderPrompt({ action: 'translate', text: 'hi', instruction: 'Into German.' }).ok, true);
});
