import { useEffect, useMemo, useRef, useState } from 'react';
import { Kbd, cn } from '@ai-anywhere/ui';
import { Home, Keyboard, Search, type LucideIcon } from 'lucide-react';
import { SETTINGS_PAGES } from '../features/settings/pages.js';
import { useUiStore } from '../store/ui.store.js';
import { openShortcutSheet } from './shortcut-keys.js';

interface Action {
  readonly label: string;
  readonly icon: LucideIcon;
  /** Extra words the filter matches, so "api key" finds the Providers page. */
  readonly keywords: string;
  readonly run: () => void;
}

/**
 * The settings window's command palette. It is a *navigator*, not the popup's
 * command runner: everything this window can do is reach a screen, so the
 * entries are the nine settings pages plus home and the cheatsheet.
 *
 * A native `<dialog>` again — modal focus containment and Escape come free,
 * which is the whole reason there is no focus-trap dependency in this app.
 */
export function ActionPalette(): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const activeRef = useRef<HTMLLIElement>(null);
  const setActiveView = useUiStore((state) => state.setActiveView);
  const setSettingsPage = useUiStore((state) => state.setSettingsPage);

  const actions = useMemo<readonly Action[]>(
    () => [
      { label: 'Home', icon: Home, keywords: 'status ready start', run: () => setActiveView('home') },
      ...SETTINGS_PAGES.map((page) => ({
        label: `Settings: ${page.name}`,
        icon: page.icon,
        keywords: page.keywords,
        run: (): void => {
          setSettingsPage(page.name);
          setActiveView('settings');
        },
      })),
      {
        label: 'Keyboard shortcuts',
        icon: Keyboard,
        keywords: 'help cheatsheet keys bindings',
        run: openShortcutSheet,
      },
    ],
    [setActiveView, setSettingsPage],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return actions;
    return actions.filter((action) => `${action.label} ${action.keywords}`.toLowerCase().includes(needle));
  }, [actions, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'k' || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      setQuery('');
      setActive(0);
      setOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A shrinking list must not leave the highlight past the end.
  useEffect(() => setActive((index) => Math.min(index, Math.max(matches.length - 1, 0))), [matches.length]);
  useEffect(() => activeRef.current?.scrollIntoView({ block: 'nearest' }), [active]);

  const step = (delta: number): void => {
    if (matches.length === 0) return;
    setActive((index) => (index + delta + matches.length) % matches.length);
  };

  const choose = (action: Action | undefined): void => {
    if (!action) return;
    setOpen(false);
    action.run();
  };

  return (
    <dialog
      ref={ref}
      aria-label="Command palette"
      onClose={() => setOpen(false)}
      className="w-[min(30rem,92vw)] overflow-hidden rounded-popup border border-border bg-background p-0 text-fg-primary shadow-popup"
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />
        <input
          // Autofocus is what makes Ctrl+K a single gesture: the dialog opens
          // with the caret already in the field.
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
              event.preventDefault();
              step(1);
            } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
              event.preventDefault();
              step(-1);
            } else if (event.key === 'Home') {
              event.preventDefault();
              setActive(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setActive(matches.length - 1);
            } else if (event.key === 'Enter') {
              event.preventDefault();
              choose(matches[active]);
            }
          }}
          placeholder="Go to…"
          aria-label="Search commands"
          role="combobox"
          aria-expanded
          aria-controls="action-list"
          className="flex-1 bg-transparent text-body-lg outline-none placeholder:text-fg-muted"
        />
        <Kbd>Esc</Kbd>
      </div>

      <ul id="action-list" role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-2">
        {matches.length === 0 ? (
          <li className="px-3 py-8 text-center text-caption text-fg-muted">
            Nothing matches “{query.trim()}”
          </li>
        ) : null}
        {matches.map((action, index) => {
          const isActive = index === active;
          return (
            <li
              key={action.label}
              ref={isActive ? activeRef : undefined}
              role="option"
              aria-selected={isActive}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(action)}
              className={cn(
                'flex cursor-default items-center gap-2.5 rounded-control px-3 py-2 text-body',
                'transition-colors duration-fast ease-calm',
                isActive ? 'bg-accent-subtle text-fg-primary' : 'hover:bg-surface-hover',
              )}
            >
              <action.icon
                aria-hidden
                className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-fg-muted')}
              />
              <span className="flex-1 truncate">{action.label}</span>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
