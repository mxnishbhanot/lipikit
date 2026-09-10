import OpenAI from 'openai';
import { appError, err, ok, type ProviderModel } from '@lipikit/shared';
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

const DESCRIPTOR = descriptorFor('openai');

/**
 * gpt-5 and the o-series are reasoning models: they reject any temperature
 * other than the default and 400 the whole request rather than ignoring it.
 */
const supportsTemperature = (model: string): boolean => !/^(gpt-5|o\d|chatgpt)/.test(model);

/** Chat-shaped ids only; the same account also lists embeddings, TTS, DALL·E. */
const isTextModel = (id: string): boolean =>
  /^(gpt|o\d|chatgpt)/.test(id) && !/audio|realtime|image/.test(id);

export function createOpenAiProvider(deps: ProviderDeps): AiProvider {
  const client = async (apiKey?: string): Promise<OpenAI> => {
    const key = apiKey ?? (await deps.keys.get('openai'));
    if (!key) throw new HttpError(401, 'No OpenAI API key stored');
    return new OpenAI({
      apiKey: key,
      baseURL: deps.baseUrls?.openai ?? DESCRIPTOR.baseUrl,
      ...(deps.fetch ? { fetch: deps.fetch as typeof fetch } : {}),
      // One retry only: the user is watching a popup, not a batch job.
      maxRetries: 1,
    });
  };

  /**
   * Responses API, not chat completions: it is the current surface for the
   * gpt-5 family (`max_output_tokens`, reasoning) and gives `output_text`
   * without walking the content array.
   */
  const params = (request: GenerateTextRequest): Omit<OpenAI.Responses.ResponseCreateParams, 'stream'> => ({
    model: request.model,
    instructions: request.system,
    input: request.prompt,
    ...(request.maxTokens === undefined ? {} : { max_output_tokens: request.maxTokens }),
    ...(request.temperature === undefined || !supportsTemperature(request.model)
      ? {}
      : { temperature: request.temperature }),
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
      // Cheapest authenticated call there is: no tokens billed.
      await (await client(apiKey)).models.list();
      return ok(undefined);
    } catch (cause) {
      return err(mapProviderError(cause));
    }
  };

  return {
    descriptor: DESCRIPTOR,

    async generateText(request) {
      try {
        const openai = await client();
        const response = await openai.responses.create(
          { ...params(request), stream: false },
          options(request),
        );
        return ok({
          text: response.output_text,
          model: response.model,
          inputTokens: response.usage?.input_tokens ?? null,
          outputTokens: response.usage?.output_tokens ?? null,
        });
      } catch (cause) {
        return err(mapProviderError(cause));
      }
    },

    async *streamText(request): AsyncGenerator<TextChunk> {
      const openai = await client();
      const stream = await openai.responses.create({ ...params(request), stream: true }, options(request));
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') yield { delta: event.delta };
      }
    },

    async listModels() {
      try {
        const openai = await client();
        const page = await openai.models.list();
        const known = new Map(DESCRIPTOR.models.map((model) => [model.id, model.contextWindow]));
        const models: ProviderModel[] = page.data
          .filter((model) => isTextModel(model.id))
          .map((model) => ({
            id: model.id,
            label: model.id,
            // The models endpoint does not report context length; the catalog
            // knows it for the models we ship, and 0 means "unknown", not zero.
            contextWindow: known.get(model.id) ?? 0,
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
        return models.length > 0 ? ok(models) : ok(DESCRIPTOR.models);
      } catch (cause) {
        return err(mapProviderError(cause));
      }
    },

    validateKey,
    healthCheck: () => validateKey(),
  };
}

export const openAiProviderFactory: AiProviderFactory = {
  id: 'openai',
  descriptor: DESCRIPTOR,
  create: createOpenAiProvider,
};
