import { globalShortcut } from 'electron';
import { appError, err, ok, type Logger } from '@lipikit/shared';
import type { HotkeyService } from './contracts.js';

export function createElectronHotkeyService(logger: Logger): HotkeyService {
  const scoped = logger.child('hotkey');
  return {
    register(accelerator, handler) {
      if (globalShortcut.isRegistered(accelerator)) {
        return err(appError('VALIDATION', `Hotkey already registered: ${accelerator}`));
      }
      const registered = globalShortcut.register(accelerator, handler);
      if (!registered) {
        // Usually another app owns the combo, or the compositor swallowed it.
        return err(appError('PERMISSION_DENIED', `OS refused hotkey: ${accelerator}`));
      }
      scoped.info('registered hotkey', { accelerator });
      return ok(undefined);
    },
    unregister: (accelerator) => globalShortcut.unregister(accelerator),
    unregisterAll: () => globalShortcut.unregisterAll(),
    isRegistered: (accelerator) => globalShortcut.isRegistered(accelerator),
  };
}
