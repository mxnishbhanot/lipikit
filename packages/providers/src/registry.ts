import { appError, err, ok, type ProviderId } from '@ai-anywhere/shared';
import type { AiProvider, AiProviderFactory, ApiKeyStore, ProviderRegistry } from './contracts.js';
import { PROVIDER_CATALOG } from './catalog.js';

/** Lazily instantiates a provider on first use and caches it per id. */
export function createProviderRegistry(deps: { keys: ApiKeyStore }): ProviderRegistry {
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
