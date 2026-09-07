import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { ApiKeyStore, FetchLike, ProviderDeps } from './contracts.js';
import { createAnthropicProvider } from './anthropic.provider.js';
import { createOpenAiProvider } from './openai.provider.js';
import { createDefaultProviderRegistry } from './registry.js';
import { mapProviderError } from './errors.js';
import { HttpError, sseData, withDeadline } from './http.js';

const keyStore = (key: string | null = 'test-key'): ApiKeyStore => ({
  get: async () => key,
  set: async () => ({ ok: true, value: undefined }),
  has: async () => key !== null,
  delete: async () => undefined,
});

interface Call {
  url: string;
  init: RequestInit | undefined;
}

/** Records what the adapter sent, answers with a canned body. */
const stubFetch = (respond: (call: Call) => Response): { fetch: FetchLike; calls: Call[] } => {
  const calls: Call[] = [];
  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, init });
      return respond({ url, init });
    },
  };
};

const sseBody = (chunks: readonly string[]): Response =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
  );

const bodyOf = (call: Call | undefined): Record<string, unknown> =>
  JSON.parse((call?.init?.body ?? '{}') as string) as Record<string, unknown>;

test('sseData reassembles events split across chunk boundaries', async () => {
  const response = sseBody(['data: {"a":1}\n\nda', 'ta: {"a":2}\n\ndata: [DONE]\n\n']);
  const payloads: string[] = [];
  for await (const payload of sseData(response)) payloads.push(payload);
  assert.deepEqual(payloads, ['{"a":1}', '{"a":2}']);
});

test('mapProviderError classifies by HTTP status', () => {
  assert.equal(mapProviderError(new HttpError(401, '')).code, 'PROVIDER_AUTH');
  assert.equal(mapProviderError(new HttpError(429, '')).code, 'PROVIDER_RATE_LIMIT');
  assert.equal(mapProviderError(new HttpError(503, '')).code, 'PROVIDER_UNAVAILABLE');
  assert.equal(mapProviderError(new HttpError(400, '')).code, 'VALIDATION');
  const aborted = new Error('aborted');
  aborted.name = 'AbortError';
  assert.equal(mapProviderError(aborted).code, 'CANCELLED');
  assert.equal(mapProviderError(new Error('offline')).code, 'PROVIDER_UNAVAILABLE');
});

test('withDeadline combines the timeout with the caller signal', () => {
  const caller = new AbortController();
  const combined = withDeadline(1_000, caller.signal);
  assert.ok(combined);
  assert.equal(combined.aborted, false);
  caller.abort();
  assert.equal(combined.aborted, true);
  assert.equal(withDeadline(undefined, undefined), undefined);
});

test('openai adapter uses the Responses API and drops temperature for gpt-5', async () => {
  const stub = stubFetch(() =>
    Response.json({
      // `object` is what makes the SDK derive `output_text` from `output`.
      object: 'response',
      model: 'gpt-5',
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'rewritten' }] }],
      usage: { input_tokens: 11, output_tokens: 3 },
    }),
  );
  const deps: ProviderDeps = { keys: keyStore(), fetch: stub.fetch };
  const result = await createOpenAiProvider(deps).generateText({
    model: 'gpt-5',
    system: 'sys',
    prompt: 'hello',
    temperature: 0.7,
    maxTokens: 256,
  });

  assert.ok(result.ok, JSON.stringify(result));
  assert.equal(result.value.text, 'rewritten');
  assert.equal(result.value.inputTokens, 11);
  assert.match(String(stub.calls[0]?.url), /\/responses$/);
  const body = bodyOf(stub.calls[0]);
  assert.equal(body['max_output_tokens'], 256);
  assert.equal(body['instructions'], 'sys');
  // gpt-5 rejects any temperature but the default, so it must not be sent.
  assert.equal('temperature' in body, false);
});

test('openai adapter keeps temperature for models that accept it', async () => {
  const stub = stubFetch(() => Response.json({ object: 'response', model: 'gpt-4.1', output: [] }));
  await createOpenAiProvider({ keys: keyStore(), fetch: stub.fetch }).generateText({
    model: 'gpt-4.1',
    system: 'sys',
    prompt: 'hello',
    temperature: 0.7,
  });
  assert.equal(bodyOf(stub.calls[0])['temperature'], 0.7);
});

test('openai adapter reports a missing key as an auth error, not a crash', async () => {
  const result = await createOpenAiProvider({ keys: keyStore(null) }).generateText({
    model: 'gpt-5',
    system: 'sys',
    prompt: 'hello',
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.error.code, 'PROVIDER_AUTH');
});

test('anthropic adapter maps messages responses and streams text deltas', async () => {
  const nonStream = stubFetch(() =>
    Response.json({
      model: 'claude-sonnet-5',
      content: [
        { type: 'thinking', thinking: 'ignored' },
        { type: 'text', text: 'hello ' },
        { type: 'text', text: 'world' },
      ],
      usage: { input_tokens: 5, output_tokens: 2 },
    }),
  );
  const request = { model: 'claude-sonnet-5', system: 'sys', prompt: 'hi', maxTokens: 64 };
  const result = await createAnthropicProvider({
    keys: keyStore(),
    fetch: nonStream.fetch,
  }).generateText(request);

  assert.ok(result.ok);
  assert.equal(result.value.text, 'hello world');
  assert.equal(result.value.outputTokens, 2);
  const headers = nonStream.calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers['x-api-key'], 'test-key');
  assert.equal(headers['anthropic-version'], '2023-06-01');
  assert.equal(bodyOf(nonStream.calls[0])['max_tokens'], 64);

  const streaming = stubFetch(() =>
    sseBody([
      'data: {"type":"message_start"}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hel"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ]),
  );
  let streamed = '';
  for await (const chunk of createAnthropicProvider({
    keys: keyStore(),
    fetch: streaming.fetch,
  }).streamText(request)) {
    streamed += chunk.delta;
  }
  assert.equal(streamed, 'hello');
  assert.equal(bodyOf(streaming.calls[0])['stream'], true);
});

test('anthropic adapter surfaces an HTTP failure as a mapped error', async () => {
  const stub = stubFetch(() => new Response('rate limited', { status: 429 }));
  const result = await createAnthropicProvider({ keys: keyStore(), fetch: stub.fetch }).generateText({
    model: 'claude-sonnet-5',
    system: 'sys',
    prompt: 'hi',
  });
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.error.code, 'PROVIDER_RATE_LIMIT');
});

test('default registry serves every catalog provider and caches instances', () => {
  const registry = createDefaultProviderRegistry({ keys: keyStore() });
  assert.deepEqual(
    registry.descriptors().map((d) => d.id),
    ['openai', 'anthropic', 'google', 'openrouter', 'groq', 'ollama', 'deepseek'],
  );
  const first = registry.get('groq');
  assert.ok(first.ok);
  assert.equal(registry.get('groq').ok && (registry.get('groq') as { value: unknown }).value, first.value);
});
