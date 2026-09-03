import { app } from 'electron';
import { IPC, IPC_EVENTS, ok, type Container, type IpcHandlerMap, type Platform } from '@ai-anywhere/shared';
import { PROVIDER_REGISTRY, API_KEY_STORE } from '@ai-anywhere/providers';
import { HISTORY_REPOSITORY, SETTINGS_REPOSITORY } from '@ai-anywhere/database';
import { TEXT_CAPTURE_SERVICE } from '@ai-anywhere/context-engine';
import { WINDOW_MANAGER } from '../tokens.js';

/**
 * Handlers are thin: resolve a service, call one method, return its Result.
 * All rules live in the packages, so the same logic is testable without
 * Electron and reusable from a future CLI or tray-only mode.
 */
export function createIpcHandlers(container: Container): IpcHandlerMap {
  const settings = () => container.resolve(SETTINGS_REPOSITORY);
  const history = () => container.resolve(HISTORY_REPOSITORY);
  const providers = () => container.resolve(PROVIDER_REGISTRY);
  const keys = () => container.resolve(API_KEY_STORE);
  const windows = () => container.resolve(WINDOW_MANAGER);

  return {
    [IPC.settings.get]: () => settings().get(),
    [IPC.settings.update]: (patch) => {
      const result = settings().update(patch);
      if (result.ok) windows().broadcast(IPC_EVENTS.settingsChanged, result.value);
      return result;
    },

    [IPC.history.list]: (query) => history().list(query),
    [IPC.history.clear]: () => history().clear(),

    [IPC.providers.list]: () => ok(providers().descriptors()),
    [IPC.providers.setApiKey]: ({ providerId, apiKey }) => keys().set(providerId, apiKey),
    [IPC.providers.hasApiKey]: async ({ providerId }) => ok(await keys().has(providerId)),

    [IPC.context.getSelection]: () => container.resolve(TEXT_CAPTURE_SERVICE).captureSelection(),

    [IPC.app.getInfo]: () =>
      ok({
        version: app.getVersion(),
        platform: process.platform as Platform,
        isPackaged: app.isPackaged,
      }),
    [IPC.app.quit]: () => {
      app.quit();
      return ok(undefined);
    },
  };
}
