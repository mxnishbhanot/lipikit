import type {
  CapturedSelection,
  CursorPoint,
  DisplayServer,
  Platform,
  PlatformCapabilities,
  Result,
  SelectionSource,
} from '@ai-anywhere/shared';

/**
 * One interface per OS capability. Windows and Linux differ only in the
 * implementation registered at startup, so no feature code branches on
 * process.platform — it asks the container for the capability.
 */
export type ClipboardBackendId = 'electron' | 'wl-clipboard' | 'xclip';

export interface ClipboardService {
  /**
   * Async because the fallbacks are external processes (`wl-paste`, `xclip`).
   * Electron's own clipboard is synchronous, but a contract that leaks which
   * backend is live would force every caller to branch on the display server.
   */
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
  /** Snapshot -> mutate -> restore, so we never eat the user's clipboard. */
  withPreservedClipboard<T>(fn: () => Promise<T>): Promise<T>;
  /** Which backend answered last time; for the diagnostics screen. */
  backend(): Promise<ClipboardBackendId>;
}

export type KeystrokeBackendId = 'nut' | 'powershell' | 'xdotool' | 'ydotool' | 'none';

/**
 * Synthetic keyboard input. This is the only way to get text out of, and back
 * into, an app we do not own: every target in scope (Slack, Chrome, VS Code,
 * Jira, Discord, Teams, WhatsApp) honours Ctrl+C/Ctrl+V, and none of them
 * expose an API we could ask instead.
 */
export interface KeystrokeService {
  sendCopy(): Promise<Result<void>>;
  sendPaste(): Promise<Result<void>>;
  /** Raise a window by native id so a paste lands in the app it came from. */
  focusWindow(windowId: string): Promise<Result<void>>;
  /** 'none' when nothing on this machine can inject keys. */
  backend(): Promise<KeystrokeBackendId>;
}

export interface ActiveWindowService {
  /** Foreground app info; nulls where the desktop refuses to say (Wayland). */
  getActiveWindow(): Promise<SelectionSource>;
}

/** The name Phase 2 asks for; the capability is unchanged. */
export type WindowContextService = ActiveWindowService;

export interface HotkeyService {
  register(accelerator: string, handler: () => void): Result<void>;
  unregister(accelerator: string): void;
  unregisterAll(): void;
  isRegistered(accelerator: string): boolean;
}

/** The name Phase 2 asks for; the capability is unchanged. */
export type KeyboardShortcutService = HotkeyService;

/**
 * Copy-out half of the round trip: inject Ctrl+C into whatever has focus,
 * wait for the target app to actually fill the clipboard, read it, and hand
 * back the user's original clipboard content.
 */
export interface SelectionService {
  captureSelection(): Promise<Result<CapturedSelection>>;
}

/**
 * Paste-in half: refocus the source window, put the new text on the
 * clipboard, inject Ctrl+V, restore the clipboard.
 */
export interface TextReplacementService {
  replaceSelection(text: string, target: SelectionSource | null): Promise<Result<void>>;
}

export interface CursorService {
  getCursorPoint(): CursorPoint;
}

export interface AutostartService {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<Result<void>>;
}

export interface PlatformInfo {
  readonly platform: Platform;
  /** 'x11' | 'wayland' | null — decides which capture strategy can work. */
  readonly displayServer: DisplayServer;
}

export interface PlatformServices {
  readonly info: PlatformInfo;
  readonly clipboard: ClipboardService;
  readonly keystroke: KeystrokeService;
  readonly hotkey: HotkeyService;
  readonly activeWindow: ActiveWindowService;
  readonly selection: SelectionService;
  readonly replacement: TextReplacementService;
  readonly cursor: CursorService;
  readonly autostart: AutostartService;
  /** Resolved backend availability, for diagnostics and renderer messaging. */
  capabilities(): Promise<PlatformCapabilities>;
}
