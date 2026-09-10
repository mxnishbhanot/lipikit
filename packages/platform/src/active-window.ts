import type { Platform, SelectionSource } from '@lipikit/shared';
import type { ActiveWindowService, PlatformInfo } from './contracts.js';
import type { CommandRunner } from './command.js';

/**
 * Foreground-window detection is the one genuinely OS-specific piece:
 * - Windows: user32 GetForegroundWindow via PowerShell + Add-Type. Walking
 *   the process list for "first process with a window" (the obvious cheap
 *   trick) reports whichever process Windows happens to enumerate first, not
 *   the window the user is typing in.
 * - Linux/X11: xdotool.
 * - Linux/Wayland: no protocol exposes the foreground window to a client, so
 *   we report nulls rather than lie. Replacement then relies on focus
 *   returning when the overlay hides.
 *
 * Every failure degrades to nulls: the capture pipeline works without knowing
 * the app name, it just cannot refocus as precisely.
 */

/** Emits "handle<TAB>processName<TAB>window title". */
const WINDOWS_SCRIPT = [
  "Add-Type -Namespace AIA -Name Fg -MemberDefinition '",
  '[DllImport("user32.dll")] public static extern System.IntPtr GetForegroundWindow();',
  '[DllImport("user32.dll")] public static extern int GetWindowTextLength(System.IntPtr h);',
  '[DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(System.IntPtr h, System.Text.StringBuilder s, int n);',
  '[DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(System.IntPtr h, out int p);',
  "';",
  '$h = [AIA.Fg]::GetForegroundWindow();',
  '$len = [AIA.Fg]::GetWindowTextLength($h);',
  '$sb = New-Object System.Text.StringBuilder ($len + 1);',
  '[void][AIA.Fg]::GetWindowText($h, $sb, $sb.Capacity);',
  // $pid is a reserved automatic variable in PowerShell; assigning it throws.
  '$procId = 0;',
  '[void][AIA.Fg]::GetWindowThreadProcessId($h, [ref]$procId);',
  '$name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName;',
  '"$([int64]$h)`t$name`t$($sb.ToString())"',
].join('');

const emptySource = (platform: Platform): SelectionSource => ({
  windowTitle: null,
  appName: null,
  windowId: null,
  platform,
});

const clean = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

export function createActiveWindowService(info: PlatformInfo, commands: CommandRunner): ActiveWindowService {
  const windows = async (): Promise<SelectionSource> => {
    const result = await commands.run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      WINDOWS_SCRIPT,
    ]);
    if (!result.ok) return emptySource('win32');
    // Title can itself contain tabs, so split on the first two only.
    const [handle, appName, ...titleParts] = result.value.stdout.trim().split('\t');
    const windowId = clean(handle);
    return {
      windowId: windowId !== null && /^\d+$/.test(windowId) && windowId !== '0' ? windowId : null,
      appName: clean(appName),
      windowTitle: clean(titleParts.join('\t')),
      platform: 'win32',
    };
  };

  const x11 = async (): Promise<SelectionSource> => {
    const active = await commands.run('xdotool', ['getactivewindow']);
    if (!active.ok) return emptySource('linux');
    const windowId = clean(active.value.stdout);
    if (windowId === null || !/^\d+$/.test(windowId)) return emptySource('linux');
    // Both queries take the id, so they are independent.
    const [title, className] = await Promise.all([
      commands.run('xdotool', ['getwindowname', windowId]),
      commands.run('xdotool', ['getwindowclassname', windowId]),
    ]);
    return {
      windowId,
      windowTitle: title.ok ? clean(title.value.stdout) : null,
      appName: className.ok ? clean(className.value.stdout) : null,
      platform: 'linux',
    };
  };

  return {
    async getActiveWindow() {
      try {
        if (info.platform === 'win32') return await windows();
        if (info.displayServer !== 'x11') return emptySource('linux');
        if (!(await commands.has('xdotool'))) return emptySource('linux');
        return await x11();
      } catch {
        return emptySource(info.platform);
      }
    },
  };
}
