import { appError, err, ok, type ProviderId } from '@ai-anywhere/shared';
import type { AiProvider, AiProviderFactory, ProviderDeps, ProviderRegistry } from './contracts.js';
import { PROVIDER_CATALOG } from './catalog.js';
import { openAiProviderFactory } from './openai.provider.js';
import { anthropicProviderFactory } from './anthropic.provider.js';
import { googleProviderFactory } from './google.provider.js';
import {
  deepSeekProviderFactory,
  groqProviderFactory,
  ollamaProviderFactory,
  openRouterProviderFactory,
} from './openai-compatible.provider.js';

/** Catalog order, so the settings dropdown is stable. */
export const ALL_PROVIDER_FACTORIES: readonly AiProviderFactory[] = [
  openAiProviderFactory,
  anthropicProviderFactory,
  googleProviderFactory,
  openRouterProviderFactory,
  groqProviderFactory,
  ollamaProviderFactory,
  deepSeekProviderFactory,
];

/** Lazily instantiates a provider on first use and caches it per id. */
export function createProviderRegistry(deps: ProviderDeps): ProviderRegistry {
  const factories = new Map<ProviderId, AiProviderFactory>();
  const instances = new Map<ProviderId, AiProvider>();

  return {
    descriptors() {
      const registered = [...factories.values()].map((f) => f.descriptor);
      return registered.length > 0 ? registered : PROVIDER_CATALOG;
    },
    register(factory) {
      factories.set(factory.id, factory);
      instances.delete(factory.id);
    },
    get(providerId) {
      const cached = instances.get(providerId);
      if (cached) return ok(cached);
      const factory = factories.get(providerId);
      if (!factory) {
        return err(appError('NOT_FOUND', `No provider implementation for "${providerId}"`));
      }
      const instance = factory.create(deps);
      instances.set(providerId, instance);
      return ok(instance);
    },
  };
}

/** Every shipped provider, registered. This is what the app wires up. */
export function createDefaultProviderRegistry(deps: ProviderDeps): ProviderRegistry {
  const registry = createProviderRegistry(deps);
  for (const factory of ALL_PROVIDER_FACTORIES) registry.register(factory);
  return registry;
}
