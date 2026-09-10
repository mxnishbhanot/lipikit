import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPC, type SavePromptRequest } from '@lipikit/shared';
import { ipcInvoke } from '../../../lib/ipc-client.js';
import { queryKeys } from '../../../lib/query-keys.js';

/** User-authored prompts. Read by both the builder and the overlay palette. */
export const useCustomPrompts = () =>
  useQuery({ queryKey: queryKeys.prompts, queryFn: () => ipcInvoke(IPC.prompts.list, undefined) });

export const useSavePrompt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SavePromptRequest) => ipcInvoke(IPC.prompts.save, request),
    // Settled, not success: a prompt whose shortcut was refused is still
    // stored, and the list has to show it alongside the error.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.prompts }),
  });
};

export const useDeletePrompt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipcInvoke(IPC.prompts.delete, { id }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.prompts }),
  });
};
