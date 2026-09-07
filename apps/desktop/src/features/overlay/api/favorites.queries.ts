import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IPC, type FavoriteKind } from '@ai-anywhere/shared';
import { ipcInvoke } from '../../../lib/ipc-client.js';
import { queryKeys } from '../../../lib/query-keys.js';

/**
 * Favourites moved out of localStorage into SQLite in Phase 7: the popup and
 * the settings window are separate renderers with separate storage, so a star
 * set in one was invisible in the other.
 */
export const useFavorites = (kind: FavoriteKind) =>
  useQuery({
    queryKey: queryKeys.favorites(kind),
    queryFn: () => ipcInvoke(IPC.favorites.list, { kind }),
    staleTime: 30_000,
  });

export const useToggleFavorite = (kind: FavoriteKind) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipcInvoke(IPC.favorites.toggle, { kind, id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites(kind) }),
  });
};
