import type { Result } from '../result.js';
import type {
  AppSettings,
  CapturedSelection,
  HistoryEntry,
  Platform,
  ProviderDescriptor,
  ProviderId,
} from '../domain/types.js';
import type { IPC, IPC_EVENTS } from './channels.js';

export interface AppInfo {
  readonly version: string;
  readonly platform: Platform;
  readonly isPackaged: boolean;
}

export interface HistoryQuery {
  readonly limit: number;
  readonly offset: number;
}

/**
 * The single source of truth for request/response shapes. Main registers
 * handlers against it, preload exposes it, renderer consumes it.
 */
export interface IpcContract {
  [IPC.settings.get]: { request: void; response: Result<AppSettings> };
  [IPC.settings.update]: { request: Partial<AppSettings>; response: Result<AppSettings> };

  [IPC.history.list]: { request: HistoryQuery; response: Result<readonly HistoryEntry[]> };
  [IPC.history.clear]: { request: void; response: Result<void> };

  [IPC.providers.list]: { request: void; response: Result<readonly ProviderDescriptor[]> };
  [IPC.providers.setApiKey]: {
    request: { providerId: ProviderId; apiKey: string };
    response: Result<void>;
  };
  [IPC.providers.hasApiKey]: { request: { providerId: ProviderId }; response: Result<boolean> };

  [IPC.context.getSelection]: { request: void; response: Result<CapturedSelection> };

  [IPC.app.getInfo]: { request: void; response: Result<AppInfo> };
  [IPC.app.quit]: { request: void; response: Result<void> };
}

export type IpcChannel = keyof IpcContract;
export type IpcRequest<C extends IpcChannel> = IpcContract[C]['request'];
export type IpcResponse<C extends IpcChannel> = IpcContract[C]['response'];

/** Main-process handler signature for one channel. */
export type IpcHandler<C extends IpcChannel> = (
  payload: IpcRequest<C>,
) => Promise<IpcResponse<C>> | IpcResponse<C>;

export type IpcHandlerMap = { [C in IpcChannel]: IpcHandler<C> };

/** Fire-and-forget main -> renderer pushes. */
export interface IpcEventContract {
  [IPC_EVENTS.settingsChanged]: AppSettings;
  [IPC_EVENTS.selectionCaptured]: CapturedSelection;
  [IPC_EVENTS.hotkeyTriggered]: { accelerator: string };
}

export type IpcEventName = keyof IpcEventContract;
export type Unsubscribe = () => void;

/** Shape mounted on `window.aiAnywhere` by the preload script. */
export interface AiAnywhereBridge {
  invoke<C extends IpcChannel>(channel: C, payload: IpcRequest<C>): Promise<IpcResponse<C>>;
  on<E extends IpcEventName>(event: E, listener: (payload: IpcEventContract[E]) => void): Unsubscribe;
}
