import { useMutation, useQuery } from '@tanstack/react-query';
import { IPC, type ReplaceSelectionRequest } from '@ai-anywhere/shared';
import { ipcInvoke } from '../../../lib/ipc-client.js';
import { queryKeys } from '../../../lib/query-keys.js';

/** What this machine can actually do; drives the popup's warning line. */
export const useCapabilities = () =>
  useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: () => ipcInvoke(IPC.context.capabilities, undefined),
    staleTime: Infinity,
  });

export const useReplaceSelection = () =>
  useMutation({
    mutationFn: (request: ReplaceSelectionRequest) => ipcInvoke(IPC.context.replaceSelection, request),
  });

/** Manual retry for when the hotkey fired before the user had selected text. */
export const useCaptureSelection = () =>
  useMutation({ mutationFn: () => ipcInvoke(IPC.context.captureSelection, undefined) });

export const closeOverlay = (): Promise<void> => ipcInvoke(IPC.overlay.close, undefined);
