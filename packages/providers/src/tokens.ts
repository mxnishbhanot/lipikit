import { token } from '@ai-anywhere/shared';
import type { ApiKeyStore, ProviderRegistry } from './contracts.js';

export const PROVIDER_REGISTRY = token<ProviderRegistry>('providers.registry');
export const API_KEY_STORE = token<ApiKeyStore>('providers.apiKeyStore');
