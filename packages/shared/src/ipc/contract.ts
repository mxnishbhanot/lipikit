import type { AppError, Result } from '../result.js';
import type {
  ActionId,
  AppContext,
  AppSettings,
  ClipboardEntry,
  CustomPrompt,
  CapturedSelection,
  FavoriteKind,
  HistoryEntry,
  Platform,
  PlatformCapabilities,
  ProviderDescriptor,
  ProviderId,
  ProviderModel,
  ProviderSettings,
  ProviderSettingsPatch,
  OverlayMode,
  ReplyStyle,
  SelectionSource,
  Tone,
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

export interface ReplaceSelectionRequest {
  readonly text: string;
  /**
   * The window the text came from. Passing it back lets the main process
   * refocus that exact window before pasting, instead of hoping the desktop
   * restores focus to the right app when the overlay hides.
   */
  readonly target: SelectionSource | null;
}

/**
 * One AI call. Everything optional falls back to the stored settings, so the
 * overlay can fire an action without first reading them.
 */
export interface GenerateRequest {
  /** Correlates streaming deltas and cancellation with this call. */
  readonly requestId: string;
  readonly action: ActionId;
  readonly text: string;
  readonly tone?: Tone;
  /** Required by `translate` and `custom`. */
  readonly instruction?: string;
  readonly providerId?: ProviderId;
  readonly model?: string;
  /** Foreground app the text came from; recorded in history. */
  readonly appName?: string | null;
  /** Foreground window title, for the {{windowTitle}} variable. */
  readonly windowTitle?: string | null;
  /**
   * A user-authored prompt body. When present it replaces the built-in
   * template for `action` entirely, after variable substitution — this is
   * how a custom prompt runs without minting an ActionId per prompt.
   */
  readonly promptTemplate?: string;
  /** Voice for a `client-reply` call; ignored by every other action. */
  readonly replyStyle?: ReplyStyle;
}

/** A custom prompt on its way in from the renderer; `id` absent means create. */
export interface SavePromptRequest {
  readonly id?: string;
  readonly label: string;
  readonly group: string;
  readonly template: string;
  readonly appId: CustomPrompt['appId'];
  readonly shortcut: CustomPrompt['shortcut'];
}

export interface GenerateResponse {
  readonly requestId: string;
  readonly text: string;
  readonly providerId: ProviderId;
  readonly model: string;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  /** True when the answer arrived as deltas the renderer already rendered. */
  readonly streamed: boolean;
}

/**
 * The single source of truth for request/response shapes. Main registers
 * handlers against it, preload exposes it, renderer consumes it.
 */
export interface IpcContract {
  [IPC.settings.get]: { request: void; response: Result<AppSettings> };
  [IPC.settings.update]: { request: Partial<AppSettings>; response: Result<AppSettings> };

  /** Null means the user cancelled the file dialog; the path means written. */
  [IPC.settings.export]: { request: void; response: Result<string | null> };
  [IPC.settings.import]: { request: void; response: Result<AppSettings | null> };

  [IPC.history.list]: { request: HistoryQuery; response: Result<readonly HistoryEntry[]> };
  [IPC.history.clear]: { request: void; response: Result<void> };
  [IPC.history.delete]: { request: { id: string }; response: Result<void> };

  [IPC.clipboard.list]: { request: HistoryQuery; response: Result<readonly ClipboardEntry[]> };
  [IPC.clipboard.delete]: { request: { id: string }; response: Result<void> };
  [IPC.clipboard.clear]: { request: void; response: Result<void> };

  /** Ids only: the renderer stars things, it does not need the rows. */
  [IPC.favorites.list]: { request: { kind: FavoriteKind }; response: Result<readonly string[]> };
  [IPC.favorites.toggle]: {
    request: { kind: FavoriteKind; id: string };
    /** True when the item is now a favourite. */
    response: Result<boolean>;
  };

  [IPC.providers.list]: { request: void; response: Result<readonly ProviderDescriptor[]> };
  [IPC.providers.setApiKey]: {
    request: { providerId: ProviderId; apiKey: string };
    response: Result<void>;
  };
  [IPC.providers.hasApiKey]: { request: { providerId: ProviderId }; response: Result<boolean> };
  [IPC.providers.deleteApiKey]: { request: { providerId: ProviderId }; response: Result<void> };
  [IPC.providers.listModels]: {
    request: { providerId: ProviderId };
    response: Result<readonly ProviderModel[]>;
  };
  [IPC.providers.validateKey]: {
    request: { providerId: ProviderId; apiKey: string };
    response: Result<void>;
  };
  [IPC.providers.healthCheck]: { request: { providerId: ProviderId }; response: Result<void> };
  [IPC.providers.settings]: { request: void; response: Result<readonly ProviderSettings[]> };
  [IPC.providers.updateSettings]: {
    request: ProviderSettingsPatch;
    response: Result<readonly ProviderSettings[]>;
  };

  [IPC.ai.generate]: { request: GenerateRequest; response: Result<GenerateResponse> };
  [IPC.ai.cancel]: { request: { requestId: string }; response: Result<void> };

  [IPC.context.getSelection]: { request: void; response: Result<CapturedSelection> };
  [IPC.context.captureSelection]: { request: void; response: Result<CapturedSelection> };
  [IPC.context.replaceSelection]: { request: ReplaceSelectionRequest; response: Result<void> };
  [IPC.context.capabilities]: { request: void; response: Result<PlatformCapabilities> };
  [IPC.context.detect]: { request: void; response: Result<AppContext> };

  [IPC.prompts.list]: { request: void; response: Result<readonly CustomPrompt[]> };
  [IPC.prompts.save]: { request: SavePromptRequest; response: Result<CustomPrompt> };
  [IPC.prompts.delete]: { request: { id: string }; response: Result<void> };

  [IPC.overlay.close]: { request: void; response: Result<void> };
  /**
   * The popup's height follows its content, so the renderer is the only thing
   * that knows the right value; main clamps it to the display it is on.
   */
  [IPC.overlay.resize]: { request: { height: number }; response: Result<void> };
  [IPC.overlay.openSettings]: { request: void; response: Result<void> };

  [IPC.feedback.diagnostics]: { request: void; response: Result<string> };
  /** Null means the user cancelled the dialog; the string is the path written. */
  [IPC.feedback.exportLogs]: { request: void; response: Result<string | null> };
  [IPC.feedback.screenshot]: { request: void; response: Result<string | null> };

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
  [IPC_EVENTS.selectionCaptureFailed]: AppError;
  /** `commandId` is set only for `quick-prompt`: the command to run on arrival. */
  [IPC_EVENTS.hotkeyTriggered]: { accelerator: string; mode: OverlayMode; commandId?: string | null };
  [IPC_EVENTS.aiDelta]: { requestId: string; delta: string };
  [IPC_EVENTS.contextDetected]: AppContext;
  [IPC_EVENTS.navigate]: { view: 'home' | 'settings' };
}

export type IpcEventName = keyof IpcEventContract;
export type Unsubscribe = () => void;

/** Shape mounted on `window.lipikit` by the preload script. */
export interface LipiKitBridge {
  invoke<C extends IpcChannel>(channel: C, payload: IpcRequest<C>): Promise<IpcResponse<C>>;
  on<E extends IpcEventName>(event: E, listener: (payload: IpcEventContract[E]) => void): Unsubscribe;
}
