import { useMemo, useState } from 'react';
import type { AppSettings } from '@ai-anywhere/shared';
import { Input, Skeleton, SkeletonText, cn } from '@ai-anywhere/ui';
import {
  Clock,
  Cpu,
  Info,
  KeyRound,
  Keyboard,
  Palette,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
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

/**
 * `keywords` is what makes the search box worth having: someone looking for
 * "api key" or "telemetry" does not know which of nine pages owns it, and a
 * filter that only matched the nine titles would tell them nothing they cannot
 * already see in the sidebar.
 */
const PAGES = [
  {
    name: 'General',
    icon: Settings2,
    keywords: 'tone streaming timeout launch login startup backup import export',
  },
  { name: 'Appearance', icon: Palette, keywords: 'theme dark light accent colour color' },
  { name: 'Providers', icon: KeyRound, keywords: 'api key openai anthropic endpoint keyring health' },
  { name: 'Models', icon: Cpu, keywords: 'model temperature tokens default provider' },
  { name: 'Shortcuts', icon: Keyboard, keywords: 'hotkey keybinding global accelerator' },
  { name: 'Prompt Templates', icon: Sparkles, keywords: 'prompts custom template variables' },
  { name: 'History', icon: Clock, keywords: 'history retention entries delete log' },
  { name: 'Privacy', icon: ShieldCheck, keywords: 'clipboard telemetry memory delete data' },
  { name: 'About', icon: Info, keywords: 'version build platform capabilities quit' },
] as const satisfies readonly { name: string; icon: LucideIcon; keywords: string }[];

type Page = (typeof PAGES)[number]['name'];

/**
 * Which of the nine pages was open last. Same reasoning as the view in the UI
 * store: it belongs to this window, not to the settings the main process owns,
 * and a name no longer in PAGES falls back rather than rendering nothing.
 */
const LAST_PAGE_KEY = 'ai-anywhere:last-settings-page';

const storedPage = (): Page => {
  const saved = localStorage.getItem(LAST_PAGE_KEY);
  return PAGES.some((entry) => entry.name === saved) ? (saved as Page) : 'General';
};

/**
 * Settings shell. Every page reads the same React Query cache entry, so the
 * settings object is loaded once here and handed down — nine pages each
 * calling useSettings would work, but then nine of them also need the pending
 * and error branches.
 */
export function SettingsLayout(): JSX.Element {
  const [page, setPage] = useState<Page>(storedPage);
  const [query, setQuery] = useState('');
  const settings = useSettings();
  const update = useUpdateSettings();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return PAGES;
    return PAGES.filter((entry) => `${entry.name} ${entry.keywords}`.toLowerCase().includes(needle));
  }, [query]);

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
    <div className="flex h-full min-h-0">
      <div className="flex w-56 shrink-0 flex-col gap-3 border-r border-border bg-background px-3 py-4">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted"
          />
          <Input
            type="search"
            value={query}
            placeholder="Search settings"
            aria-label="Search settings"
            className="h-8 pl-8 text-caption"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto" aria-label="Settings sections">
          {matches.length === 0 ? (
            <p className="px-2 py-1.5 text-caption text-fg-muted">No section matches “{query.trim()}”.</p>
          ) : null}
          {matches.map(({ name, icon: Icon }) => {
            const active = name === page;
            return (
              <button
                key={name}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  localStorage.setItem(LAST_PAGE_KEY, name);
                  setPage(name);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left text-body',
                  'transition-colors duration-fast ease-calm',
                  active
                    ? 'bg-accent-subtle font-medium text-accent'
                    : 'text-fg-secondary hover:bg-surface-hover hover:text-fg-primary',
                )}
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {settings.isPending ? (
          // The page frame is already on screen, so the wait is drawn as the
          // page it is about to become rather than as a line of grey text.
          <div className="space-y-6 px-8 py-7">
            <Skeleton className="h-7 w-52" />
            <SkeletonText lines={3} />
            <SkeletonText heading lines={2} />
          </div>
        ) : null}
        {settings.isError ? (
          <p className="px-8 py-7 text-body text-danger">{settings.error.message}</p>
        ) : null}
        {settings.data ? body(settings.data) : null}
      </div>
    </div>
  );
}
