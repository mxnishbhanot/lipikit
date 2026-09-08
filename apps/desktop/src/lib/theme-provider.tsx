import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { IPC } from '@ai-anywhere/shared';
import { useQuery } from '@tanstack/react-query';
import { ipcInvoke } from './ipc-client.js';
import { queryKeys } from './query-keys.js';
import { resolveTheme, type ResolvedTheme, type ThemeMode } from './theme.js';

interface ThemeContextValue {
  /** What the user chose, including 'system'. */
  readonly mode: ThemeMode;
  /** What is actually painted right now. */
  readonly resolved: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: 'system', resolved: 'light' });

/**
 * Applies the saved theme to <html> for whichever window is rendering, and
 * exposes the resolved value to components that need to branch on it (an
 * illustration, a syntax theme) rather than on a CSS class.
 *
 * Setting the theme is deliberately *not* here: the theme is one row in
 * settings and the Appearance page already writes it through the same
 * mutation as every other setting. A `setTheme` in this context would be a
 * second way to change one value, and the two would drift.
 *
 * 'system' has to keep tracking the OS after the window has opened, so the
 * media-query listener lives here rather than being written in both windows.
 */
export function ThemeProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => ipcInvoke(IPC.settings.get, undefined),
    staleTime: Infinity,
  });
  const mode = settings.data?.theme ?? 'system';
  const accent = settings.data?.accentColor ?? 'emerald';
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  // Emerald is the base token set, so it carries no attribute: one less
  // stylesheet block, and an unknown accent degrades to emerald rather than
  // to no accent.
  useEffect(() => {
    if (accent === 'emerald') document.documentElement.removeAttribute('data-accent');
    else document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      const next = resolveTheme(mode, media.matches);
      document.documentElement.classList.toggle('dark', next === 'dark');
      // Native form controls, scrollbars and the window frame follow this.
      document.documentElement.style.colorScheme = next;
      setResolved(next);
    };
    apply();
    if (mode !== 'system') return undefined;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  return <ThemeContext.Provider value={{ mode, resolved }}>{children}</ThemeContext.Provider>;
}

/* eslint-disable-next-line react-refresh/only-export-components --
   the hook belongs beside the context it reads; splitting it out would be a
   file whose only job is a one-line useContext. */
export function useThemeMode(): ThemeContextValue {
  return useContext(ThemeContext);
}
