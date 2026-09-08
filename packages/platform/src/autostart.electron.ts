import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';
import { BRANDING, appError, err, ok } from '@ai-anywhere/shared';
import type { AutostartService, PlatformInfo } from './contracts.js';

/**
 * Read back in main: a login launch starts in the tray instead of opening the
 * settings window over whatever the user is doing at login.
 */
const HIDDEN_FLAG = '--hidden';

/**
 * Windows: Electron writes the Run registry key.
 * Linux: setLoginItemSettings is a no-op there, so the XDG autostart spec is
 * the mechanism — a .desktop file in $XDG_CONFIG_HOME/autostart, which every
 * mainstream desktop (GNOME, KDE, XFCE, Cinnamon) reads.
 */
export function createElectronAutostartService(info: PlatformInfo): AutostartService {
  const configHome = process.env['XDG_CONFIG_HOME'] ?? join(homedir(), '.config');
  const desktopFile = join(configHome, 'autostart', 'ai-anywhere.desktop');

  /**
   * In a packaged build this is the AppImage/binary itself. Running from a dev
   * checkout it is the `electron` binary, which would relaunch Electron with
   * no app: autostart is only offered once packaged.
   */
  const launchCommand = (): string =>
    app.isPackaged ? `"${process.env['APPIMAGE'] ?? app.getPath('exe')}" ${HIDDEN_FLAG}` : '';

  return {
    async isEnabled() {
      if (info.platform === 'win32') return app.getLoginItemSettings().openAtLogin;
      return existsSync(desktopFile);
    },
    async setEnabled(enabled) {
      if (info.platform === 'win32') {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          path: app.getPath('exe'),
          args: [HIDDEN_FLAG],
        });
        return ok(undefined);
      }
      try {
        if (!enabled) {
          rmSync(desktopFile, { force: true });
          return ok(undefined);
        }
        const command = launchCommand();
        if (command.length === 0) {
          return err(appError('PLATFORM_UNSUPPORTED', 'Launch at login works only in an installed build'));
        }
        mkdirSync(join(configHome, 'autostart'), { recursive: true });
        writeFileSync(
          desktopFile,
          [
            '[Desktop Entry]',
            'Type=Application',
            `Name=${BRANDING.appName}`,
            `Exec=${command}`,
            'Terminal=false',
            'X-GNOME-Autostart-enabled=true',
            '',
          ].join('\n'),
          { encoding: 'utf8', mode: 0o644 },
        );
        return ok(undefined);
      } catch (cause) {
        return err(appError('UNKNOWN', 'Failed to change launch at login', cause));
      }
    },
  };
}
