import OpenAI from 'openai';
import { appError, err, ok, type ProviderId } from '@lipikit/shared';
import type {
  AiProvider,
  AiProviderFactory,
  GenerateTextRequest,
  ProviderDeps,
  TextChunk,
} from './contracts.js';
import { descriptorFor } from './catalog.js';
import { mapProviderError } from './errors.js';
import { HttpError } from './http.js';

/**
 * OpenRouter, Groq, DeepSeek and Ollama all expose the OpenAI chat-completions
 * API verbatim, so they are one adapter with a different base URL rather than
 * four near-identical files. Only OpenAI itself needs its own adapter, because
 * only it speaks the newer Responses API the gpt-5 family expects.
 */
export function createOpenAiCompatibleProvider(id: ProviderId, deps: ProviderDeps): AiProvider {
  const descriptor = descriptorFor(id);

  const client = async (apiKey?: string): Promise<OpenAI> => {
    const key = apiKey ?? (await deps.keys.get(id));
    if (!key && descriptor.requiresApiKey) {
      throw new HttpError(401, `No ${descriptor.label} API key stored`);
    }
    return new OpenAI({
      // Ollama ignores the header but the SDK refuses to construct without one.
      apiKey: key ?? 'local',
      baseURL: deps.baseUrls?.[id] ?? descriptor.baseUrl,
      ...(deps.fetch ? { fetch: deps.fetch as typeof fetch } : {}),
      maxRetries: 1,
    });
  };

  const params = (request: GenerateTextRequest): Omit<OpenAI.Chat.ChatCompletionCreateParams, 'stream'> => ({
    model: request.model,
    messages: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.prompt },
    ],
    ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
    ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
  });

  const options = (request: GenerateTextRequest): { timeout?: number; signal?: AbortSignal } => ({
    ...(request.timeoutMs === undefined ? {} : { timeout: request.timeoutMs }),
    ...(request.signal === undefined ? {} : { signal: request.signal }),
  });

  const validateKey = async (apiKey?: string) => {
    if (apiKey !== undefined && apiKey.trim().length === 0) {
      return err(appError('VALIDATION', 'API key is empty'));
    }
    try {
      await (await client(apiKey)).models.list();
      return ok(undefined);
    } catch (cause) {
      return err(mapProviderError(cause));
    }
  };

  return {
    descriptor,

    async generateText(request) {
      try {
        const completion = await (
          await client()
        ).chat.completions.create({ ...params(request), stream: false }, options(request));
        return ok({
          text: completion.choices[0]?.message?.content ?? '',
          model: completion.model,
          inputTokens: completion.usage?.prompt_tokens ?? null,
          outputTokens: completion.usage?.completion_tokens ?? null,
        });
      } catch (cause) {
        return err(mapProviderError(cause));
      }
    },

    async *streamText(request): AsyncGenerator<TextChunk> {
      const stream = await (
        await client()
      ).chat.completions.create({ ...params(request), stream: true }, options(request));
      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content;
        if (delta) yield { delta };
      }
    },

    async listModels() {
      try {
        const page = await (await client()).models.list();
        const known = new Map(descriptor.models.map((model) => [model.id, model.contextWindow]));
        const models = page.data
          .map((model) => ({
            id: model.id,
            label: model.id,
            contextWindow: known.get(model.id) ?? 0,
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
        return models.length > 0 ? ok(models) : ok(descriptor.models);
      } catch (cause) {
        return err(mapProviderError(cause));
      }
    },

    validateKey,
    healthCheck: () => validateKey(),
  };
}

const factory = (id: ProviderId): AiProviderFactory => ({
  id,
  descriptor: descriptorFor(id),
  create: (deps) => createOpenAiCompatibleProvider(id, deps),
});

export const openRouterProviderFactory = factory('openrouter');
export const groqProviderFactory = factory('groq');
export const deepSeekProviderFactory = factory('deepseek');
export const ollamaProviderFactory = factory('ollama');
