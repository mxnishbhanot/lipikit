import { useState } from 'react';
import type { AppSettings } from '@ai-anywhere/shared';
import { useSettings, useUpdateSettings } from '../api/settings.queries.js';
import { AboutPage } from './pages/AboutPage.js';
import { AppearancePage } from './pages/AppearancePage.js';
import { GeneralPage } from './pages/GeneralPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { ModelsPage } from './pages/ModelsPage.js';
import { PrivacyPage } from './pages/PrivacyPage.js';
import { PromptTemplatesPage } from './pages/PromptTemplatesPage.js';
import { ProvidersPage } from './pages/ProvidersPage.js';
import { ShortcutsPage } from './pages/ShortcutsPage.js';

const PAGES = [
  'General',
  'Appearance',
  'Providers',
  'Models',
  'Shortcuts',
  'History',
  'Privacy',
  'Prompt Templates',
  'About',
] as const;

type Page = (typeof PAGES)[number];

/**
 * Settings shell. Every page reads the same React Query cache entry, so the
 * settings object is loaded once here and handed down — nine pages each
 * calling useSettings would work, but then nine of them also need the pending
 * and error branches.
 */
export function SettingsLayout(): JSX.Element {
  const [page, setPage] = useState<Page>('General');
  const settings = useSettings();
  const update = useUpdateSettings();

  const body = (current: AppSettings): JSX.Element => {
    // Optimistic writes are deliberately absent: a rejected hotkey or a failed
    // autostart write must not leave the UI showing a value main refused.
    const patch = (value: Partial<AppSettings>): void => update.mutate(value);
    const error = update.error ?? null;

    switch (page) {
      case 'General':
        return <GeneralPage settings={current} patch={patch} error={error} />;
      case 'Appearance':
        return <AppearancePage settings={current} patch={patch} />;
      case 'Providers':
        return <ProvidersPage settings={current} />;
      case 'Models':
        return <ModelsPage settings={current} patch={patch} />;
      case 'Shortcuts':
        return <ShortcutsPage settings={current} patch={patch} error={error} />;
      case 'History':
        return <HistoryPage settings={current} patch={patch} />;
      case 'Privacy':
        return <PrivacyPage settings={current} patch={patch} />;
      case 'Prompt Templates':
        return <PromptTemplatesPage />;
      case 'About':
        return <AboutPage />;
    }
  };

  return (
    <div className="flex h-full gap-6">
      <nav className="w-44 shrink-0 space-y-1" aria-label="Settings sections">
        {PAGES.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={name === page ? 'page' : undefined}
            onClick={() => setPage(name)}
            className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
              name === page ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        {settings.isPending ? <p className="text-sm text-muted-foreground">Loading settings…</p> : null}
        {settings.isError ? <p className="text-sm text-destructive">{settings.error.message}</p> : null}
        {settings.data ? body(settings.data) : null}
      </div>
    </div>
  );
}
