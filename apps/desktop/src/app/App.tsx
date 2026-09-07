import { useQuery } from '@tanstack/react-query';
import { Button } from '@ai-anywhere/ui';
import { IPC } from '@ai-anywhere/shared';
import { SettingsLayout } from '../features/settings/components/SettingsLayout.js';
import { ipcInvoke } from '../lib/ipc-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { useUiStore } from '../store/ui.store.js';

// History, prompts and providers all live inside settings now: two places to
// edit the same rows is how a stale UI bug starts.
const VIEWS = ['home', 'settings'] as const;

export function App(): JSX.Element {
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);
  const appInfo = useQuery({
    queryKey: queryKeys.appInfo,
    queryFn: () => ipcInvoke(IPC.app.getInfo, undefined),
    staleTime: Infinity,
  });

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold">AI Anywhere</h1>
          <p className="text-xs text-muted-foreground">
            {appInfo.data ? `v${appInfo.data.version} · ${appInfo.data.platform}` : 'starting…'}
          </p>
        </div>
        <nav className="flex gap-2">
          {VIEWS.map((view) => (
            <Button
              key={view}
              size="sm"
              variant={view === activeView ? 'default' : 'ghost'}
              onClick={() => setActiveView(view)}
            >
              {view}
            </Button>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        {activeView === 'settings' ? <SettingsLayout /> : null}
        {activeView === 'home' ? (
          <p className="text-sm text-muted-foreground">
            Select text in any app, press the global hotkey, pick an action. Choose a provider and enter its
            API key under <strong>settings</strong> first.
          </p>
        ) : null}
      </main>
    </div>
  );
}
