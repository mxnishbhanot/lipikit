import { token } from '@ai-anywhere/shared';
import type { CaptureStrategy, TextCaptureService } from './contracts.js';

export const TEXT_CAPTURE_SERVICE = token<TextCaptureService>('context.capture');
export const CAPTURE_STRATEGIES = token<readonly CaptureStrategy[]>('context.strategies');
