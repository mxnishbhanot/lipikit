import { token } from '@ai-anywhere/shared';
import type { CaptureStrategy, TextCaptureService } from './contracts.js';
import type { AppContextService } from './app-detection.js';

export const TEXT_CAPTURE_SERVICE = token<TextCaptureService>('context.capture');
export const CAPTURE_STRATEGIES = token<readonly CaptureStrategy[]>('context.strategies');
export const APP_CONTEXT_SERVICE = token<AppContextService>('context.app');
