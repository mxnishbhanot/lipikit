import { app } from 'electron';
import { appError, err, ok } from '@ai-anywhere/shared';
import type { AutostartService, PlatformInfo } from './contracts.js';

/**
 * Windows: Electron writes the Run registry key.
 * Linux: Electron's setLoginItemSettings is a no-op, so a .desktop file in
 * ~/.config/autostart is the only mechanism — deferred to the feature phase.
 */
export function createElectronAutostartService(info: PlatformInfo): AutostartService {
  return {
    async isEnabled() {
      if (info.platform !== 'win32') return false;
      return app.getLoginItemSettings().openAtLogin;
    },
    async setEnabled(enabled) {
      if (info.platform !== 'win32') {
        // ponytail: Linux autostart needs a written .desktop file; add when the settings UI ships.
        return err(appError('PLATFORM_UNSUPPORTED', 'Linux autostart not implemented yet'));
      }
      app.setLoginItemSettings({ openAtLogin: enabled, path: app.getPath('exe') });
      return ok(undefined);
    },
  };
}
