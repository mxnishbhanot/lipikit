import { appError, err, ok, type ProviderModel } from '@lipikit/shared';
import type {
  AiProvider,
  AiProviderFactory,
  FetchLike,
  GenerateTextRequest,
  ProviderDeps,
  TextChunk,
} from './contracts.js';
import { descriptorFor } from './catalog.js';
import { mapProviderError } from './errors.js';
import { HttpError, httpJson, httpStream, sseData, withDeadline } from './http.js';

const DESCRIPTOR = descriptorFor('anthropic');
/** Pinned: Anthropic's API is versioned by header, not by URL path. */
const API_VERSION = '2023-06-01';
/** `max_tokens` is required by the Messages API, so it needs a default. */
const DEFAULT_MAX_TOKENS = 1024;

interface MessagesResponse {
  readonly model: string;
  readonly content: readonly { readonly type: string; readonly text?: string }[];
  readonly usage?: { readonly input_tokens?: number; readonly output_tokens?: number };
}

interface ModelsResponse {
  readonly data: readonly { readonly id: string; readonly display_name?: string }[];
}

/**
 * Plain fetch rather than @anthropic-ai/sdk: the surface used here is one POST
 * and one GET, and the SDK would be a second HTTP stack in the bundle for it.
 */
export function createAnthropicProvider(deps: ProviderDeps): AiProvider {
  const fetchImpl: FetchLike = deps.fetch ?? ((url, init) => fetch(url, init));
  const baseUrl = deps.baseUrls?.anthropic ?? DESCRIPTOR.baseUrl;

  const headers = async (apiKey?: string): Promise<Record<string, string>> => {
    const key = apiKey ?? (await deps.keys.get('anthropic'));
    if (!key) throw new HttpError(401, 'No Anthropic API key stored');
    return {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': API_VERSION,
    };
  };

  const body = (request: GenerateTextRequest, stream: boolean): string =>
    JSON.stringify({
      model: request.model,
      system: request.system,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
      stream,
    });

  const init = async (request: GenerateTextRequest, stream: boolean): Promise<RequestInit> => {
    const signal = withDeadline(request.timeoutMs, request.signal);
    return {
      method: 'POST',
      headers: await headers(),
      body: body(request, stream),
      ...(signal ? { signal } : {}),
    };
  };

  const validateKey = async (apiKey?: string) => {
    if (apiKey !== undefined && apiKey.trim().length === 0) {
      return err(appError('VALIDATION', 'API key is empty'));
    }
    try {
      await httpJson<ModelsResponse>(fetchImpl, `${baseUrl}/models?limit=1`, {
        headers: await headers(apiKey),
      });
      return ok(undefined);
    } catch (cause) {
      return err(mapProviderError(cause));
    }
  };

  return {
    descriptor: DESCRIPTOR,

    async generateText(request) {
      try {
        const response = await httpJson<MessagesResponse>(
          fetchImpl,
          `${baseUrl}/messages`,
          await init(request, false),
        );
        return ok({
          text: response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text ?? '')
            .join(''),
          model: response.model,
          inputTokens: response.usage?.input_tokens ?? null,
          outputTokens: response.usage?.output_tokens ?? null,
        });
      } catch (cause) {
        return err(mapProviderError(cause));
      }
    },

    async *streamText(request): AsyncGenerator<TextChunk> {
      const response = await httpStream(fetchImpl, `${baseUrl}/messages`, await init(request, true));
      for await (const payload of sseData(response)) {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield { delta: event.delta.text ?? '' };
        }
      }
    },

    async listModels() {
      try {
        const response = await httpJson<ModelsResponse>(fetchImpl, `${baseUrl}/models?limit=100`, {
          headers: await headers(),
        });
        const known = new Map(DESCRIPTOR.models.map((model) => [model.id, model.contextWindow]));
        const models: ProviderModel[] = response.data.map((model) => ({
          id: model.id,
          label: model.display_name ?? model.id,
          contextWindow: known.get(model.id) ?? 200_000,
        }));
        return models.length > 0 ? ok(models) : ok(DESCRIPTOR.models);
      } catch (cause) {
        return err(mapProviderError(cause));
      }
    },

    validateKey,
    healthCheck: () => validateKey(),
  };
}

export const anthropicProviderFactory: AiProviderFactory = {
  id: 'anthropic',
  descriptor: DESCRIPTOR,
  create: createAnthropicProvider,
};
