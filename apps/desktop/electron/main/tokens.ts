import { token, type AppEnv, type Logger } from '@ai-anywhere/shared';
import type { WindowManager } from './windows/window-manager.js';

export const ENV = token<AppEnv>('app.env');
export const LOGGER = token<Logger>('app.logger');
export const WINDOW_MANAGER = token<WindowManager>('app.windowManager');
