export type ThemeChoice = 'light' | 'dark';

/** Matches the pre-paint script in index.html; changing one means both. */
export const THEME_KEY = 'ai-anywhere:theme';

/**
 * What to paint, given a stored choice and the OS preference. Pure so it can
 * be tested without a window, and the only place the precedence is written:
 * an explicit choice wins, anything else follows the OS.
 */
export function resolveTheme(stored: string | null, prefersDark: boolean): ThemeChoice {
  if (stored === 'dark' || stored === 'light') return stored;
  return prefersDark ? 'dark' : 'light';
}
