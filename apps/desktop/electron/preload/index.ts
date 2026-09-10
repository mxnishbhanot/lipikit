import { contextBridge, ipcRenderer } from 'electron';
import { IPC, IPC_EVENTS, type LipiKitBridge } from '@lipikit/shared';

const ALLOWED_CHANNELS = new Set<string>(Object.values(IPC).flatMap((group) => Object.values(group)));
const ALLOWED_EVENTS = new Set<string>(Object.values(IPC_EVENTS));

/**
 * The whole native surface the renderer gets: two functions, both channel-
 * allowlisted. contextIsolation + sandbox mean the renderer cannot reach
 * ipcRenderer, fs, or require by any other route.
 */
const bridge: LipiKitBridge = {
  invoke(channel, payload) {
    if (!ALLOWED_CHANNELS.has(channel)) {
      throw new Error(`Blocked IPC channel: ${String(channel)}`);
    }
    return ipcRenderer.invoke(channel, payload) as never;
  },
  on(event, listener) {
    if (!ALLOWED_EVENTS.has(event)) {
      throw new Error(`Blocked IPC event: ${String(event)}`);
    }
    // The raw IpcRendererEvent is dropped: the renderer has no business
    // holding a handle to a sender it could reply on.
    const wrapped = (_e: unknown, payload: unknown): void => listener(payload as never);
    ipcRenderer.on(event, wrapped);
    return () => ipcRenderer.removeListener(event, wrapped);
  },
};

contextBridge.exposeInMainWorld('lipikit', bridge);
