import { useEffect } from 'react';
import { IPC } from '@ai-anywhere/shared';
import { useQuery } from '@tanstack/react-query';
import { ipcInvoke } from './ipc-client.js';
import { queryKeys } from './query-keys.js';

/**
 * Applies the saved theme to <html> for whichever window is rendering. Both
 * the main window and the popup need it, and 'system' has to keep tracking
 * the OS after the window has opened, so the media-query listener lives here
 * rather than being written twice.
 */
export function useTheme(): void {
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => ipcInvoke(IPC.settings.get, undefined),
    staleTime: Infinity,
  });
  const theme = settings.data?.theme ?? 'system';

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (theme !== 'system') return undefined;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
