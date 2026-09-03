import { token } from '@ai-anywhere/shared';
import type {
  ActiveWindowService,
  AutostartService,
  ClipboardService,
  HotkeyService,
  PlatformServices,
} from './contracts.js';

export const CLIPBOARD_SERVICE = token<ClipboardService>('platform.clipboard');
export const HOTKEY_SERVICE = token<HotkeyService>('platform.hotkey');
export const ACTIVE_WINDOW_SERVICE = token<ActiveWindowService>('platform.activeWindow');
export const AUTOSTART_SERVICE = token<AutostartService>('platform.autostart');
export const PLATFORM_SERVICES = token<PlatformServices>('platform.services');
