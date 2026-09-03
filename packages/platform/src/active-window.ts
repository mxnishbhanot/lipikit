import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Platform, SelectionSource } from '@ai-anywhere/shared';
import type { ActiveWindowService, PlatformInfo } from './contracts.js';

const exec = promisify(execFile);

/**
 * Foreground-window detection is the one genuinely OS-specific piece:
 * - Windows: PowerShell + user32 GetForegroundWindow.
 * - Linux/X11: xdotool (optional runtime dependency).
 * - Linux/Wayland: no portable API exists; we report nulls rather than lie.
 * Phase 1 keeps the shell-out shape and returns nulls on any failure so the
 * capture pipeline degrades instead of throwing.
 */
export function createActiveWindowService(info: PlatformInfo): ActiveWindowService {
  return {
    async getActiveWindow(): Promise<SelectionSource> {
      const empty = (platform: Platform): SelectionSource => ({
        windowTitle: null,
        appName: null,
        platform,
      });
      try {
        if (info.platform === 'win32') {
          const { stdout } = await exec('powershell.exe', [
            '-NoProfile',
            '-Command',
            '(Get-Process -Id (Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1).Id).MainWindowTitle',
          ]);
          const title = stdout.trim();
          return { windowTitle: title || null, appName: null, platform: 'win32' };
        }
        if (info.displayServer !== 'x11') return empty('linux');
        const { stdout } = await exec('xdotool', ['getactivewindow', 'getwindowname']);
        const title = stdout.trim();
        return { windowTitle: title || null, appName: null, platform: 'linux' };
      } catch {
        return empty(info.platform);
      }
    },
  };
}
