import { appError, err, ok, type ProviderModel } from '@ai-anywhere/shared';
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

const DESCRIPTOR = descriptorFor('google');

interface GenerateContentResponse {
  readonly modelVersion?: string;
  readonly candidates?: readonly {
    readonly content?: { readonly parts?: readonly { readonly text?: string }[] };
  }[];
  readonly usageMetadata?: {
    readonly promptTokenCount?: number;
    readonly candidatesTokenCount?: number;
  };
}

interface ListModelsResponse {
  readonly models?: readonly {
    readonly name: string;
    readonly displayName?: string;
    readonly inputTokenLimit?: number;
    readonly supportedGenerationMethods?: readonly string[];
  }[];
}

const textOf = (response: GenerateContentResponse): string =>
  (response.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('');

/**
 * Gemini's REST API over plain fetch. The key goes in `x-goog-api-key`, not
 * the `?key=` query parameter the docs lead with: a URL ends up in proxy and
 * crash logs, a header does not.
 */
export function createGoogleProvider(deps: ProviderDeps): AiProvider {
  const fetchImpl: FetchLike = deps.fetch ?? ((url, init) => fetch(url, init));
  const baseUrl = deps.baseUrls?.google ?? DESCRIPTOR.baseUrl;

  const headers = async (apiKey?: string): Promise<Record<string, string>> => {
    const key = apiKey ?? (await deps.keys.get('google'));
    if (!key) throw new HttpError(401, 'No Google API key stored');
    return { 'content-type': 'application/json', 'x-goog-api-key': key };
  };

  const init = async (request: GenerateTextRequest): Promise<RequestInit> => {
    const signal = withDeadline(request.timeoutMs, request.signal);
    return {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.maxTokens === undefined ? {} : { maxOutputTokens: request.maxTokens }),
        },
      }),
      ...(signal ? { signal } : {}),
    };
  };

  const validateKey = async (apiKey?: string) => {
    if (apiKey !== undefined && apiKey.trim().length === 0) {
      return err(appError('VALIDATION', 'API key is empty'));
    }
    try {
      await httpJson<ListModelsResponse>(fetchImpl, `${baseUrl}/models?pageSize=1`, {
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
        const response = await httpJson<GenerateContentResponse>(
          fetchImpl,
          `${baseUrl}/models/${request.model}:generateContent`,
          await init(request),
        );
        return ok({
          text: textOf(response),
          model: response.modelVersion ?? request.model,
          inputTokens: response.usageMetadata?.promptTokenCount ?? null,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        });
      } catch (cause) {
        return err(mapProviderError(cause));
      }
    },

    async *streamText(request): AsyncGenerator<TextChunk> {
      const response = await httpStream(
        fetchImpl,
        `${baseUrl}/models/${request.model}:streamGenerateContent?alt=sse`,
        await init(request),
      );
      for await (const payload of sseData(response)) {
        const delta = textOf(JSON.parse(payload) as GenerateContentResponse);
        if (delta.length > 0) yield { delta };
      }
    },

    async listModels() {
      try {
        const response = await httpJson<ListModelsResponse>(fetchImpl, `${baseUrl}/models?pageSize=200`, {
          headers: await headers(),
        });
        const models: ProviderModel[] = (response.models ?? [])
          .filter((model) => model.supportedGenerationMethods?.includes('generateContent') ?? true)
          .map((model) => ({
            // Names come back path-qualified ("models/gemini-2.5-pro").
            id: model.name.replace(/^models\//, ''),
            label: model.displayName ?? model.name,
            contextWindow: model.inputTokenLimit ?? 0,
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

export const googleProviderFactory: AiProviderFactory = {
  id: 'google',
  descriptor: DESCRIPTOR,
  create: createGoogleProvider,
};
