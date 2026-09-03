import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPC } from '@ai-anywhere/shared';
import { ipcInvoke } from '../../../lib/ipc-client.js';
import { queryKeys } from '../../../lib/query-keys.js';

export const useHistory = (limit = 25, offset = 0) =>
  useQuery({
    queryKey: queryKeys.history(limit, offset),
    queryFn: () => ipcInvoke(IPC.history.list, { limit, offset }),
  });

export const useClearHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ipcInvoke(IPC.history.clear, undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  });
};
