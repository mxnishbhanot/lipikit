import type { ProviderDescriptor } from '@ai-anywhere/shared';

/**
 * Static metadata only — model ids and context sizes, no vendor SDK calls.
 * Lets the settings UI be built before any provider is implemented.
 */
export const PROVIDER_CATALOG: readonly ProviderDescriptor[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    requiresApiKey: true,
    models: [{ id: 'gpt-4o-mini', label: 'GPT-4o mini', contextWindow: 128_000 }],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    requiresApiKey: true,
    models: [{ id: 'claude-sonnet-5', label: 'Claude Sonnet 5', contextWindow: 200_000 }],
  },
  {
    id: 'google',
    label: 'Google',
    requiresApiKey: true,
    models: [{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', contextWindow: 1_000_000 }],
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    requiresApiKey: false,
    models: [{ id: 'llama3.1', label: 'Llama 3.1 8B', contextWindow: 128_000 }],
  },
] as const;
