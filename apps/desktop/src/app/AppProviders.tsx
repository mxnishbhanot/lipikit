import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { IPC_EVENTS } from '@ai-anywhere/shared';
import { ipcOn } from '../lib/ipc-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { useTheme } from '../lib/use-theme.js';

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
      <ThemedShell>{children}</ThemedShell>
    </QueryClientProvider>
  );
}

/** Inside the provider, because the theme comes from the settings query. */
function ThemedShell({ children }: { readonly children: ReactNode }): JSX.Element {
  useTheme();
  return <>{children}</>;
}
