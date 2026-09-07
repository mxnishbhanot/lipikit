import type { FetchLike } from './contracts.js';

/** Error carrying the HTTP status so `mapProviderError` can classify it. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`HTTP ${status}: ${body.slice(0, 500)}`);
    this.name = 'HttpError';
  }
}

/**
 * Caller cancellation and the request deadline are both aborts, so they
 * combine into one signal instead of the adapter tracking two.
 */
export function withDeadline(timeoutMs?: number, signal?: AbortSignal): AbortSignal | undefined {
  const deadline = timeoutMs !== undefined && timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;
  if (deadline && signal) return AbortSignal.any([deadline, signal]);
  return deadline ?? signal;
}

export async function httpJson<T>(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<T> {
  const response = await fetchImpl(url, init);
  if (!response.ok) throw new HttpError(response.status, await response.text().catch(() => ''));
  return (await response.json()) as T;
}

export async function httpStream(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<Response> {
  const response = await fetchImpl(url, init);
  if (!response.ok) throw new HttpError(response.status, await response.text().catch(() => ''));
  return response;
}

/**
 * Yields the payload of each `data:` line of an SSE body. Anthropic and Gemini
 * both stream SSE, so the framing is parsed once here; only the JSON shape
 * inside differs per adapter.
 */
export async function* sseData(response: Response): AsyncGenerator<string> {
  const body = response.body;
  if (!body) return;
  const decoder = new TextDecoder();
  let buffer = '';
  // Node's ReadableStream is async-iterable; the DOM lib type does not say so.
  for await (const bytes of body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(bytes, { stream: true });
    // An event ends at a blank line; anything after the last one is a partial
    // chunk and has to stay in the buffer.
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload.length > 0 && payload !== '[DONE]') yield payload;
      }
    }
  }
}
