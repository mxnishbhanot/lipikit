import type { Platform, SelectionSource } from '@ai-anywhere/shared';
import type { Result } from '@ai-anywhere/shared';

/**
 * One interface per OS capability. Windows and Linux differ only in the
 * implementation registered at startup, so no feature code branches on
 * process.platform — it asks the container for the capability.
 */
export interface ClipboardService {
  readText(): string;
  writeText(text: string): void;
  /** Snapshot -> mutate -> restore, so we never eat the user's clipboard. */
  withPreservedClipboard<T>(fn: () => Promise<T>): Promise<T>;
}

export interface HotkeyService {
  register(accelerator: string, handler: () => void): Result<void>;
  unregister(accelerator: string): void;
  unregisterAll(): void;
  isRegistered(accelerator: string): boolean;
}

export interface ActiveWindowService {
  /** Foreground app info; nulls where the desktop refuses to say (Wayland). */
  getActiveWindow(): Promise<SelectionSource>;
}

export interface AutostartService {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<Result<void>>;
}

export interface PlatformInfo {
  readonly platform: Platform;
  /** 'x11' | 'wayland' | null — decides which capture strategy can work. */
  readonly displayServer: 'x11' | 'wayland' | null;
}

export interface PlatformServices {
  readonly info: PlatformInfo;
  readonly clipboard: ClipboardService;
  readonly hotkey: HotkeyService;
  readonly activeWindow: ActiveWindowService;
  readonly autostart: AutostartService;
}
