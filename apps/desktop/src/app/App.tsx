import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, EmptyState, Kbd } from '@ai-anywhere/ui';
import { IPC, IPC_EVENTS } from '@ai-anywhere/shared';
import { SettingsLayout } from '../features/settings/components/SettingsLayout.js';
import { Onboarding } from '../features/onboarding/components/Onboarding.js';
import { useHasApiKey, useProviders, useSettings } from '../features/settings/api/settings.queries.js';
import { useOnline } from '../lib/use-online.js';
import { ipcInvoke, ipcOn } from '../lib/ipc-client.js';
import { queryKeys } from '../lib/query-keys.js';
import { useUiStore } from '../store/ui.store.js';

// History, prompts and providers all live inside settings now: two places to
// edit the same rows is how a stale UI bug starts.
const VIEWS = ['home', 'settings'] as const;

export function App(): JSX.Element {
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);
  // The popup's settings button opens this window on the page it asked for,
  // rather than dropping the user on home to click again.
  useEffect(() => ipcOn(IPC_EVENTS.navigate, (payload) => setActiveView(payload.view)), [setActiveView]);

  const appInfo = useQuery({
    queryKey: queryKeys.appInfo,
    queryFn: () => ipcInvoke(IPC.app.getInfo, undefined),
    staleTime: Infinity,
  });

  // Settings are the gate, so the first paint waits for them: rendering the
  // main window and then swapping in onboarding a tick later is a flash of the
  // wrong app.
  const settings = useSettings();
  if (settings.data === undefined) return <div className="h-screen bg-background" />;
  if (!settings.data.onboardingCompleted) return <Onboarding settings={settings.data} />;

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
      {/* Settings owns its own scrolling and padding — it is a sidebar plus a
          scroll pane, and an outer scroller would move the sidebar with it. */}
      <main className="min-h-0 flex-1 overflow-hidden">
        {activeView === 'settings' ? <SettingsLayout /> : null}
        {activeView === 'home' ? <Home onOpenSettings={() => setActiveView('settings')} /> : null}
      </main>
    </div>
  );
}

/**
 * The home pane is a status screen, not a dashboard: it says whether the app
 * can actually do its job right now, and points at the one thing to fix when
 * it cannot. The hotkey instructions are the *success* state, so they are only
 * shown once there is a key to use them with.
 */
function Home({ onOpenSettings }: { onOpenSettings: () => void }): JSX.Element {
  const settings = useSettings();
  const providers = useProviders();
  const online = useOnline();
  const provider = providers.data?.find((entry) => entry.id === settings.data?.defaultProvider) ?? null;
  const hasKey = useHasApiKey(settings.data?.defaultProvider ?? 'openai');

  if (!online) return <EmptyState kind="offline" />;

  if (provider?.requiresApiKey === true && hasKey.data === false) {
    return (
      <EmptyState
        kind="no-api-key"
        description={`${provider.label} has no key stored yet. Add one and the hotkey starts answering.`}
        action={<Button onClick={onOpenSettings}>Open providers</Button>}
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-title font-medium text-fg-primary">Ready when you are</p>
      <p className="max-w-sm text-body text-fg-muted">
        Select text in any app, press <Kbd combo={settings.data?.globalHotkey ?? 'Control+Space'} />, then
        pick a command.
      </p>
    </div>
  );
}
