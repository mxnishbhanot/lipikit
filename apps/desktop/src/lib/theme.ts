import type { AppSettings } from '@lipikit/shared';

export type ThemeMode = AppSettings['theme'];
export type ResolvedTheme = 'light' | 'dark';

/** Pure, so it is testable without a window or a settings round-trip. */
export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return prefersDark ? 'dark' : 'light';
  return mode;
}
