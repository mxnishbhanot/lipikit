import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPC, type AppSettings } from '@ai-anywhere/shared';
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

export const useProviders = () =>
  useQuery({
    queryKey: queryKeys.providers,
    queryFn: () => ipcInvoke(IPC.providers.list, undefined),
    staleTime: Infinity,
  });
