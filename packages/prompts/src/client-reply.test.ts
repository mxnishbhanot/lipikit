import { test } from 'vitest';
import assert from 'node:assert/strict';
import type { HistoryEntry } from '@ai-anywhere/shared';
import { formatMemory, MEMORY_LIMIT, parseReply, REPLY_COMMANDS } from './client-reply.js';
import { renderPrompt } from './render.js';

const ANSWER = [
  'ANALYSIS',
  'questions: When will it be fixed? | Is our data safe?',
  'urgency: high',
  'sentiment: negative',
  'categories: bug report, deployment issue',
  '---',
  'Thanks for flagging this. We are investigating now.',
].join('\n');

test('parseReply splits the analysis block from the reply', () => {
  const { analysis, reply } = parseReply(ANSWER);
  assert.deepEqual(analysis.questions, ['When will it be fixed?', 'Is our data safe?']);
  assert.equal(analysis.urgency, 'high');
  assert.equal(analysis.sentiment, 'negative');
  assert.deepEqual(analysis.categories, ['bug report', 'deployment issue']);
  assert.equal(reply, 'Thanks for flagging this. We are investigating now.');
});

test('parseReply keeps the whole text as the reply when the format is ignored', () => {
  const { analysis, reply } = parseReply('Sure, happy to help.');
  assert.equal(reply, 'Sure, happy to help.');
  assert.deepEqual(analysis.questions, []);
  assert.equal(analysis.urgency, null);
});

test('parseReply treats a half-streamed answer as reply-so-far, never as a loss', () => {
  const partial = ANSWER.slice(0, ANSWER.indexOf('---'));
  assert.equal(parseReply(partial).reply, partial.trim());
});

test('parseReply drops values the model made up', () => {
  const { analysis } = parseReply(ANSWER.replace('urgency: high', 'urgency: catastrophic'));
  assert.equal(analysis.urgency, null);
});

test('parseReply reads "none" as no questions', () => {
  assert.deepEqual(parseReply(ANSWER.replace(/questions:.*/, 'questions: none')).analysis.questions, []);
});

const entry = (n: number): HistoryEntry => ({
  id: String(n),
  action: 'client-reply',
  providerId: 'openai',
  model: 'gpt-5-mini',
  input: `in ${n}`,
  output: `out ${n}`,
  tone: null,
  appName: null,
  createdAt: n,
});

test('formatMemory caps at 20 and flips newest-first into a chronological transcript', () => {
  // History lists newest first; the model must read oldest first.
  const entries = Array.from({ length: 25 }, (_, i) => entry(25 - i));
  const memory = formatMemory(entries);
  assert.equal((memory.match(/- them:/g) ?? []).length, MEMORY_LIMIT);
  assert.ok(memory.indexOf('in 6') < memory.indexOf('in 25'));
});

test('formatMemory is empty for no history, so the template has no dangling heading', () => {
  assert.equal(formatMemory([]), '');
});

test('client-reply renders the style and memory, and needs no instruction', () => {
  const result = renderPrompt({
    action: 'client-reply',
    text: 'The deploy failed again.',
    variables: { style: 'empathetic', memory: 'PRIOR\n\n' },
  });
  assert.ok(result.ok);
  assert.ok(result.value.prompt.startsWith('PRIOR'));
  assert.ok(result.value.prompt.includes('empathetic'));
  assert.ok(result.value.system.includes('Never invent information'));
});

test('every reply style is a runnable command', () => {
  assert.equal(REPLY_COMMANDS.length, 6);
  assert.ok(REPLY_COMMANDS.every((c) => c.action === 'client-reply' && c.replyStyle !== undefined));
});
