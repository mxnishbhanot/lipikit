import { token } from '@ai-anywhere/shared';
import type {
  ActiveWindowService,
  AutostartService,
  ClipboardService,
  CursorService,
  HotkeyService,
  KeystrokeService,
  PlatformServices,
  SelectionService,
  TextReplacementService,
} from './contracts.js';

export const CLIPBOARD_SERVICE = token<ClipboardService>('platform.clipboard');
export const KEYSTROKE_SERVICE = token<KeystrokeService>('platform.keystroke');
export const HOTKEY_SERVICE = token<HotkeyService>('platform.hotkey');
export const ACTIVE_WINDOW_SERVICE = token<ActiveWindowService>('platform.activeWindow');
export const SELECTION_SERVICE = token<SelectionService>('platform.selection');
export const TEXT_REPLACEMENT_SERVICE = token<TextReplacementService>('platform.textReplacement');
export const CURSOR_SERVICE = token<CursorService>('platform.cursor');
export const AUTOSTART_SERVICE = token<AutostartService>('platform.autostart');
export const PLATFORM_SERVICES = token<PlatformServices>('platform.services');
