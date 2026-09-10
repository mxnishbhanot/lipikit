import { token, type AppEnv, type Logger } from '@lipikit/shared';
import type { AiService } from './services/ai-service.js';
import type { ClipboardMonitor } from './services/clipboard-monitor.js';
import type { SelectionFlow } from './services/selection-flow.js';
import type { WindowManager } from './windows/window-manager.js';

export const ENV = token<AppEnv>('app.env');
export const LOGGER = token<Logger>('app.logger');
export const WINDOW_MANAGER = token<WindowManager>('app.windowManager');
export const SELECTION_FLOW = token<SelectionFlow>('app.selectionFlow');
export const AI_SERVICE = token<AiService>('app.aiService');
export const CLIPBOARD_MONITOR = token<ClipboardMonitor>('app.clipboardMonitor');
/**
 * Mutable on purpose: the provider adapters read `deps.baseUrls[id]` on every
 * call, so editing an endpoint in settings takes effect by mutating this
 * record — no registry rebuild, no cached client to invalidate.
 */
export const PROVIDER_BASE_URLS = token<Record<string, string>>('app.providerBaseUrls');
