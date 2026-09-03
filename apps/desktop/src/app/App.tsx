import { useQuery } from '@tanstack/react-query';
import { Button } from '@ai-anywhere/ui';
import { IPC } from '@ai-anywhere/shared';
import { HistoryList } from '../features/history/components/HistoryList.js';
import { SettingsPanel } from '../features/settings/components/SettingsPanel.js';
import { ipcInvoke } from '../lib/ipc-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { useUiStore } from '../store/ui.store.js';

const VIEWS = ['home', 'settings', 'history'] as const;

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
        {activeView === 'settings' ? <SettingsPanel /> : null}
        {activeView === 'history' ? <HistoryList /> : null}
        {activeView === 'home' ? (
          <p className="text-sm text-muted-foreground">
            Foundation only — AI actions land in the next phase.
          </p>
        ) : null}
      </main>
    </div>
  );
}
