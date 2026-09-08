import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { IPC_EVENTS } from '@ai-anywhere/shared';
import { DURATION, EASE } from '@ai-anywhere/ui';
import { ipcOn } from '../lib/ipc-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { ThemeProvider } from '../lib/theme-provider.js';

export function AppProviders({ children }: { readonly children: ReactNode }): JSX.Element {
  // One client per app instance; created lazily so StrictMode's double render
  // does not throw away a warm cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Everything comes from local IPC: cheap to refetch, but window
            // focus churn in a popup-driven app would refetch constantly.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    // Main process owns the truth; a push invalidates instead of polling.
    return ipcOn(IPC_EVENTS.settingsChanged, (settings) => {
      queryClient.setQueryData(queryKeys.settings, settings);
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        `reducedMotion="user"` is the whole reduced-motion story: framer-motion
        drops transforms and keeps opacity for every animation in the tree, so
        no variant has to check the media query itself.
      */}
      <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE }}>
        {/* Inside the query provider: the theme comes from the settings query. */}
        <ThemeProvider>{children}</ThemeProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
