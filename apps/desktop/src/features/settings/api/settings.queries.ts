import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPC, type AppSettings, type ProviderId, type ProviderSettingsPatch } from '@ai-anywhere/shared';
import { ipcInvoke } from '../../../lib/ipc-client.js';
import { queryKeys } from '../../../lib/query-keys.js';

/** Data access for the settings feature. Components call hooks, never IPC. */
export const useSettings = () =>
  useQuery({ queryKey: queryKeys.settings, queryFn: () => ipcInvoke(IPC.settings.get, undefined) });

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) => ipcInvoke(IPC.settings.update, patch),
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.settings, settings),
  });
};

/**
 * Switch the active provider *and* the model in one write. A provider change
 * alone would leave `defaultModel` naming a model the new vendor has never
 * heard of, and the next call would 404 — so the model moves with it: the
 * provider's own stored default when there is one, else the first model in its
 * catalog.
 */
export const useSwitchProvider = () => {
  const queryClient = useQueryClient();
  const providers = useProviders();
  const overrides = useProviderSettings();
  return useMutation({
    mutationFn: (providerId: ProviderId) => {
      const stored = overrides.data?.find((row) => row.providerId === providerId)?.defaultModel;
      const catalog = providers.data?.find((row) => row.id === providerId)?.models[0]?.id;
      const defaultModel = stored ?? catalog;
      return ipcInvoke(IPC.settings.update, {
        defaultProvider: providerId,
        // No catalog and no stored default means an unknown vendor list; keep
        // whatever model is saved rather than clearing it to nothing.
        ...(defaultModel === undefined ? {} : { defaultModel }),
      });
    },
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.settings, settings),
  });
};

export const useProviders = () =>
  useQuery({
    queryKey: queryKeys.providers,
    queryFn: () => ipcInvoke(IPC.providers.list, undefined),
    staleTime: Infinity,
  });

/** Live model list from the vendor; falls back to the static catalog on error. */
export const useProviderModels = (providerId: ProviderId) =>
  useQuery({
    queryKey: queryKeys.providerModels(providerId),
    queryFn: () => ipcInvoke(IPC.providers.listModels, { providerId }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

export const useHasApiKey = (providerId: ProviderId) =>
  useQuery({
    queryKey: queryKeys.providerKey(providerId),
    queryFn: () => ipcInvoke(IPC.providers.hasApiKey, { providerId }),
  });

/**
 * Validate then store: an API key that does not work is worse than none,
 * because the failure then shows up on the next hotkey press instead of here.
 */
export const useSaveApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ providerId, apiKey }: { providerId: ProviderId; apiKey: string }) => {
      await ipcInvoke(IPC.providers.validateKey, { providerId, apiKey });
      await ipcInvoke(IPC.providers.setApiKey, { providerId, apiKey });
    },
    onSuccess: (_result, { providerId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.providerKey(providerId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.providerModels(providerId) });
    },
  });
};

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: ProviderId) => ipcInvoke(IPC.providers.deleteApiKey, { providerId }),
    onSuccess: (_result, providerId) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.providerKey(providerId) }),
  });
};

export const useHealthCheck = () =>
  useMutation({
    mutationFn: (providerId: ProviderId) => ipcInvoke(IPC.providers.healthCheck, { providerId }),
  });

/** Per-provider overrides: enabled, endpoint, default model. */
export const useProviderSettings = () =>
  useQuery({
    queryKey: queryKeys.providerSettings,
    queryFn: () => ipcInvoke(IPC.providers.settings, undefined),
  });

export const useUpdateProviderSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProviderSettingsPatch) => ipcInvoke(IPC.providers.updateSettings, patch),
    onSuccess: (rows, patch) => {
      queryClient.setQueryData(queryKeys.providerSettings, rows);
      // A new endpoint means a different server: whatever models the old one
      // reported no longer apply.
      if (patch.baseUrl !== undefined) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.providerModels(patch.providerId) });
      }
    },
  });
};

/** Resolves to the written file path, or null when the user cancelled. */
export const useExportSettings = () =>
  useMutation({ mutationFn: () => ipcInvoke(IPC.settings.export, undefined) });

/**
 * An import rewrites settings, prompts and provider overrides at once, so the
 * whole cache is dropped rather than each key patched by hand.
 */
export const useImportSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipcInvoke(IPC.settings.import, undefined),
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
