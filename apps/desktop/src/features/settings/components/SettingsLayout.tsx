import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings } from '@lipikit/shared';
import { Input, Skeleton, SkeletonText, cn } from '@lipikit/ui';
import { Search } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../api/settings.queries.js';
import { filterSettingsPages } from '../pages.js';
import { useUiStore } from '../../../store/ui.store.js';
import { AboutPage } from './pages/AboutPage.js';
import { AppearancePage } from './pages/AppearancePage.js';
import { FeedbackPage } from './pages/FeedbackPage.js';
import { GeneralPage } from './pages/GeneralPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { ModelsPage } from './pages/ModelsPage.js';
import { PrivacyPage } from './pages/PrivacyPage.js';
import { PromptTemplatesPage } from './pages/PromptTemplatesPage.js';
import { ProvidersPage } from './pages/ProvidersPage.js';
import { ShortcutsPage } from './pages/ShortcutsPage.js';

/**
 * Arrow keys move real DOM focus between the sidebar buttons rather than a
 * highlight index: the buttons are already in the tab order, so the browser
 * keeps announcing them and the focus ring keeps working. Querying the nav for
 * its buttons is also what makes this survive the search filter — the list it
 * walks is whatever is on screen.
 */
function moveFocus(nav: HTMLElement | null, to: number | 'next' | 'previous'): void {
  const buttons = [...(nav?.querySelectorAll('button') ?? [])];
  if (buttons.length === 0) return;
  const current = buttons.findIndex((button) => button === document.activeElement);
  const index =
    typeof to === 'number'
      ? to
      : to === 'next'
        ? (current + 1 + buttons.length) % buttons.length
        : (current - 1 + buttons.length) % buttons.length;
  buttons[(index + buttons.length) % buttons.length]?.focus();
}

/**
 * Settings shell. Every page reads the same React Query cache entry, so the
 * settings object is loaded once here and handed down — ten pages each
 * calling useSettings would work, but then nine of them also need the pending
 * and error branches.
 */
export function SettingsLayout(): JSX.Element {
  const page = useUiStore((state) => state.settingsPage);
  const setPage = useUiStore((state) => state.setSettingsPage);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const settings = useSettings();
  const update = useUpdateSettings();

  const matches = useMemo(() => filterSettingsPages(query), [query]);

  // Ctrl+F is the search gesture for this window; the popup's own Ctrl+K is
  // the palette, so the two never fight over the same chord.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'f' || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      searchRef.current?.select();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
      case 'Feedback':
        return <FeedbackPage />;
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
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search settings"
            aria-label="Search settings"
            className="h-8 pl-8 text-caption"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              // Down and Enter both hand off to the filtered list, so a search
              // never needs the mouse or a walk back through Tab.
              if (event.key === 'ArrowDown' || event.key === 'Enter') {
                event.preventDefault();
                moveFocus(navRef.current, 0);
              } else if (event.key === 'Escape' && query.length > 0) {
                event.preventDefault();
                setQuery('');
              }
            }}
          />
        </div>

        <nav
          ref={navRef}
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto"
          aria-label="Settings sections"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') moveFocus(navRef.current, 'next');
            else if (event.key === 'ArrowUp') moveFocus(navRef.current, 'previous');
            else if (event.key === 'Home') moveFocus(navRef.current, 0);
            else if (event.key === 'End') moveFocus(navRef.current, matches.length - 1);
            else return;
            event.preventDefault();
          }}
        >
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
                onClick={() => setPage(name)}
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
