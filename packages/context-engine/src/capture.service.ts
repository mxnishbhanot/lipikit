import { appError, err, type Logger } from '@lipikit/shared';
import type { CaptureStrategy, TextCaptureService } from './contracts.js';

export function createTextCaptureService(
  strategies: readonly CaptureStrategy[],
  logger: Logger,
): TextCaptureService {
  const scoped = logger.child('capture');
  return {
    async captureSelection() {
      let lastError = appError('UNKNOWN', 'No capture strategy available');
      for (const strategy of strategies) {
        if (!(await strategy.isAvailable())) continue;
        const result = await strategy.capture();
        if (result.ok) {
          scoped.debug('captured selection', { strategy: strategy.id, chars: result.value.text.length });
          return result;
        }
        lastError = result.error;
      }
      return err(lastError);
    },
  };
}
