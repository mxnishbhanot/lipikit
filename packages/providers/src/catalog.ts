import type { ProviderDescriptor, ProviderId } from '@lipikit/shared';

/**
 * Static metadata: model ids, context sizes, endpoints. No vendor SDK calls,
 * so the settings UI works offline and before a key is entered. Adapters call
 * `listModels()` to refresh this at runtime.
 */
export const PROVIDER_CATALOG: readonly ProviderDescriptor[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-5', label: 'GPT-5', contextWindow: 400_000 },
      { id: 'gpt-5-mini', label: 'GPT-5 mini', contextWindow: 400_000 },
      { id: 'gpt-5-nano', label: 'GPT-5 nano', contextWindow: 400_000 },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-opus-5', label: 'Claude Opus 5', contextWindow: 200_000 },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', contextWindow: 200_000 },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', contextWindow: 200_000 },
    ],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    requiresApiKey: true,
    apiKeyUrl: 'https://aistudio.google.com/apikey',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', contextWindow: 1_000_000 },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', contextWindow: 1_000_000 },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    requiresApiKey: true,
    apiKeyUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      { id: 'openai/gpt-5-mini', label: 'GPT-5 mini', contextWindow: 400_000 },
      { id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', contextWindow: 200_000 },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', contextWindow: 128_000 },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    requiresApiKey: true,
    apiKeyUrl: 'https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', contextWindow: 128_000 },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', contextWindow: 128_000 },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    requiresApiKey: false,
    apiKeyUrl: null,
    baseUrl: 'http://127.0.0.1:11434/v1',
    models: [
      { id: 'llama3.1', label: 'Llama 3.1 8B', contextWindow: 128_000 },
      { id: 'qwen2.5', label: 'Qwen 2.5 7B', contextWindow: 128_000 },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    requiresApiKey: true,
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3', contextWindow: 64_000 },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1', contextWindow: 64_000 },
    ],
  },
] as const;

export const descriptorFor = (id: ProviderId): ProviderDescriptor => {
  const found = PROVIDER_CATALOG.find((entry) => entry.id === id);
  if (!found) throw new Error(`No catalog entry for provider "${id}"`);
  return found;
};
