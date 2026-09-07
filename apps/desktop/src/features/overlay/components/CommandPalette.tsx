import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@ai-anywhere/ui';
import { Star } from 'lucide-react';
import { COMMAND_GROUPS, filterCommands, suggestedFor, type PaletteCommand } from '@ai-anywhere/prompts';
import { cn } from '@ai-anywhere/ui';
import type { AppContext, CustomPrompt } from '@ai-anywhere/shared';
import type { RecentPrompt } from '../use-command-prefs.js';

interface Entry {
  readonly command: PaletteCommand;
  readonly input: string;
}

interface Section {
  readonly title: string;
  readonly items: readonly Entry[];
}

export interface CommandPaletteProps {
  /** Built-in catalog plus the user's own prompts, already merged. */
  readonly commands: readonly PaletteCommand[];
  /** Foreground app, when the context engine could name it. */
  readonly context: AppContext | null;
  readonly favorites: readonly string[];
  readonly recents: readonly RecentPrompt[];
  readonly onToggleFavorite: (commandId: string) => void;
  readonly onRun: (command: PaletteCommand, input: string) => void;
  readonly disabled: boolean;
  /** Needed to match a user prompt against the detected app. */
  readonly customPrompts: readonly CustomPrompt[];
}

/**
 * The command list: search, favourites, recents, then the catalog by group.
 * Hand-rolled rather than cmdk, because arrow keys over one flat array is
 * less code than a dependency plus its dialog and portal plumbing — and the
 * flat array is the same thing keyboard nav and rendering both need.
 */
export function CommandPalette(props: CommandPaletteProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  // Set once a command needs a line of text before it can run (Translate,
  // Ask AI). Holds the whole two-step state: which command, and what has
  // been typed so far.
  const [pending, setPending] = useState<Entry | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLInputElement>(null);

  const sections = useMemo<readonly Section[]>(() => {
    const matches = filterCommands(query, props.commands);
    const visible = new Set(matches.map((command) => command.id));
    const byId = new Map(props.commands.map((command) => [command.id, command]));
    const plain = (command: PaletteCommand): Entry => ({ command, input: '' });
    const shown = (command: PaletteCommand): boolean => visible.has(command.id);

    // Suggestions, favourites and recents are shortcuts into the same
    // catalog, so they are filtered by the same search rather than each
    // keeping an index of its own.
    const suggested = suggestedFor(props.context, props.commands, props.customPrompts)
      .filter(shown)
      .map(plain);

    const favorites = props.favorites
      .map((id) => byId.get(id))
      .filter((command): command is PaletteCommand => command !== undefined && shown(command))
      .map(plain);

    const recents = props.recents
      .map((recent) => {
        const command = byId.get(recent.commandId);
        return command && shown(command) ? { command, input: recent.input } : null;
      })
      .filter((entry): entry is Entry => entry !== null);

    // Built-in groups keep their fixed order; a user prompt's own group name
    // is appended after them in first-seen order.
    const groupNames = [
      ...COMMAND_GROUPS,
      ...matches.map((command) => command.group).filter((group) => !COMMAND_GROUPS.includes(group)),
    ];
    const groups = [...new Set(groupNames)].map((group) => ({
      title: group,
      items: matches.filter((command) => command.group === group).map(plain),
    }));

    return [
      {
        title: props.context?.appId === null ? 'Suggested' : `For ${props.context?.label ?? ''}`,
        items: suggested,
      },
      { title: 'Favorites', items: favorites },
      { title: 'Recent', items: recents },
      ...groups,
    ].filter((section) => section.items.length > 0);
  }, [query, props.commands, props.context, props.customPrompts, props.favorites, props.recents]);

  // One flat array is what the arrow keys walk; the sections above are only
  // how it is drawn.
  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  // A shrinking result list must not leave the highlight past the end.
  useEffect(() => setActive((index) => Math.min(index, Math.max(flat.length - 1, 0))), [flat.length]);
  useEffect(() => activeRef.current?.scrollIntoView({ block: 'nearest' }), [active]);
  useEffect(() => pendingRef.current?.focus(), [pending]);

  const choose = (command: PaletteCommand, input: string): void => {
    if (props.disabled) return;
    if (command.inputPlaceholder !== undefined && input.trim().length === 0) {
      setPending({ command, input });
      return;
    }
    props.onRun(command, input);
  };

  const onListKeyDown = (event: React.KeyboardEvent): void => {
    if (flat.length === 0) return;
    if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) {
      event.preventDefault();
      setActive((index) => (index + 1) % flat.length);
    } else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) {
      event.preventDefault();
      setActive((index) => (index - 1 + flat.length) % flat.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActive(flat.length - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const entry = flat[active];
      if (entry) choose(entry.command, entry.input);
    } else if (event.key === 'd' && event.ctrlKey) {
      event.preventDefault();
      const entry = flat[active];
      if (entry) props.onToggleFavorite(entry.command.id);
    }
  };

  if (pending) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3">
        <p className="text-xs text-muted-foreground">{pending.command.label}</p>
        <Input
          ref={pendingRef}
          value={pending.input}
          placeholder={pending.command.inputPlaceholder}
          aria-label={pending.command.inputPlaceholder}
          onChange={(event) => setPending({ ...pending, input: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && pending.input.trim().length > 0) {
              event.preventDefault();
              props.onRun(pending.command, pending.input.trim());
            }
            if (event.key === 'Escape') {
              // Back to the list, not out of the popup: the overlay's own
              // Escape handler lives on the window and would close it.
              event.preventDefault();
              event.stopPropagation();
              setPending(null);
            }
          }}
        />
        <p className="text-[11px] text-muted-foreground">Enter to run · Esc to go back</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden" onKeyDown={onListKeyDown}>
      <div className="px-3 pb-2">
        <Input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          placeholder="Search commands…"
          aria-label="Search commands"
          role="combobox"
          aria-expanded
          aria-controls="command-list"
          className="h-8"
        />
      </div>

      <div id="command-list" role="listbox" className="flex-1 overflow-y-auto px-2 pb-2">
        {flat.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No matching command</p>
        ) : null}
        {sections.map((section) => (
          <div key={section.title} className="mb-1">
            <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((entry) => {
              const index = flat.indexOf(entry);
              const isActive = index === active;
              const starred = props.favorites.includes(entry.command.id);
              return (
                <div
                  key={`${section.title}:${entry.command.id}:${entry.input}`}
                  ref={isActive ? activeRef : undefined}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={props.disabled}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(entry.command, entry.input)}
                  className={cn(
                    'group flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                    props.disabled && 'pointer-events-none opacity-50',
                  )}
                >
                  <span className="flex-1 truncate">
                    {entry.command.label}
                    {entry.input ? <span className="text-muted-foreground"> · {entry.input}</span> : null}
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={starred ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(event) => {
                      // The star sits inside the row, so its click must not
                      // also fall through and run the command.
                      event.stopPropagation();
                      props.onToggleFavorite(entry.command.id);
                    }}
                    className={cn(
                      'shrink-0 rounded p-0.5 hover:bg-background/60',
                      starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', starred && 'fill-current text-primary')} />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        ↑↓ navigate · Enter run · Ctrl+D favorite · Esc close
      </p>
    </div>
  );
}
