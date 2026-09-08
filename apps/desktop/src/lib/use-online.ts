import { useEffect, useState } from 'react';

/**
 * Whether the renderer thinks it has a network. `navigator.onLine` only knows
 * about the link, not about reachability, so this is enough to *explain* a
 * failure and never enough to hide the provider's own error — a captive portal
 * still reports online and still fails the request.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = (): void => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
