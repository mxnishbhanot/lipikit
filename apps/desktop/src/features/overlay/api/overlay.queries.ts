import { useEffect, useRef, type RefObject } from 'react';
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

/** Hides the popup and brings the settings window forward. */
export const openSettingsWindow = (): Promise<void> => ipcInvoke(IPC.overlay.openSettings, undefined);

/**
 * Keeps the popup window exactly as tall as its content: the renderer is the
 * only side that knows how many rows a search matched, so it measures itself
 * and main clamps the value to the display.
 *
 * A `ResizeObserver` rather than an effect on the data, because the height
 * changes for reasons no single query knows about — a section collapsing, an
 * error line appearing, a font finishing loading.
 */
export function useOverlayAutoHeight(): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return undefined;
    let last = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      // Only on a real change: an observer that echoes its own resize back
      // would ping-pong with the window manager.
      if (height === 0 || height === last) return;
      last = height;
      void ipcInvoke(IPC.overlay.resize, { height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}
