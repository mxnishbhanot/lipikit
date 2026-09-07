import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPC } from '@ai-anywhere/shared';
import { ipcInvoke } from '../../../lib/ipc-client.js';
import { queryKeys } from '../../../lib/query-keys.js';

export const useClipboardHistory = (limit = 25, offset = 0) =>
  useQuery({
    queryKey: queryKeys.clipboard(limit, offset),
    queryFn: () => ipcInvoke(IPC.clipboard.list, { limit, offset }),
    // Recording happens in main on a poll, so the list is stale the moment
    // it renders; refetching while the page is open keeps it honest.
    refetchInterval: 5_000,
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => () =>
  queryClient.invalidateQueries({ queryKey: ['clipboard'] });

export const useDeleteClipboardEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipcInvoke(IPC.clipboard.delete, { id }),
    onSuccess: invalidate(queryClient),
  });
};

export const useClearClipboardHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipcInvoke(IPC.clipboard.clear, undefined),
    onSuccess: invalidate(queryClient),
  });
};
