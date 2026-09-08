import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState, Input, Kbd, cn, fade, slideUp } from '@ai-anywhere/ui';
import {
  Braces,
  Clock,
  CornerDownLeft,
  Languages,
  MessageSquare,
  PenLine,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import { COMMAND_GROUPS, filterCommands, suggestedFor, type PaletteCommand } from '@ai-anywhere/prompts';
import type { AppContext, CustomPrompt } from '@ai-anywhere/shared';
import type { RecentPrompt } from '../use-command-prefs.js';
import { nextSectionStart } from '../section-nav.js';

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
  /** Search text; the field itself lives in the popup header. */
  readonly query: string;
  readonly onToggleFavorite: (commandId: string) => void;
  readonly onRun: (command: PaletteCommand, input: string) => void;
  readonly disabled: boolean;
  /** Needed to match a user prompt against the detected app. */
  readonly customPrompts: readonly CustomPrompt[];
}

/**
 * One icon per section, so a row is recognisable before it is read. Groups the
 * user invented for their own prompts fall through to the wand.
 */
const GROUP_ICONS: Record<string, typeof PenLine> = {
  Writing: PenLine,
  Developer: Braces,
  Communication: MessageSquare,
  Translation: Languages,
  AI: Sparkles,
  Favorites: Star,
  Recent: Clock,
};

const iconFor = (title: string): typeof PenLine => GROUP_ICONS[title] ?? Wand2;

/**
 * The command list: search results, then favourites, recents and the catalog
 * by group. Hand-rolled rather than cmdk, because arrow keys over one flat
 * array is less code than a dependency plus its dialog and portal plumbing —
 * and the flat array is the same thing keyboard nav and rendering both need.
 *
 * The search field is *not* here: it lives in the popup header, so this
 * component takes `query` and owns only the selection. Keyboard navigation is
 * a window listener for the same reason — the focus stays in the header field
 * while the arrows walk this list.
 */
export function CommandPalette(props: CommandPaletteProps): JSX.Element {
  const [active, setActive] = useState(0);
  // Set once a command needs a line of text before it can run (Translate,
  // Ask AI). Holds the whole two-step state: which command, and what has
  // been typed so far.
  const [pending, setPending] = useState<Entry | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLInputElement>(null);

  const sections = useMemo<readonly Section[]>(() => {
    const matches = filterCommands(props.query, props.commands);
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
  }, [props.query, props.commands, props.context, props.customPrompts, props.favorites, props.recents]);

  // One flat array is what the arrow keys walk; the sections above are only
  // how it is drawn.
  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  // Index of the first row of each section, for Tab's section-to-section jump.
  const sectionStarts = useMemo(() => {
    let index = 0;
    return sections.map((section) => {
      const start = index;
      index += section.items.length;
      return start;
    });
  }, [sections]);

  // A shrinking result list must not leave the highlight past the end.
  useEffect(() => setActive((index) => Math.min(index, Math.max(flat.length - 1, 0))), [flat.length]);
  useEffect(() => setActive(0), [props.query]);
  useEffect(() => activeRef.current?.scrollIntoView({ block: 'nearest' }), [active]);
  useEffect(() => pendingRef.current?.focus(), [pending]);

  const { disabled, onRun, onToggleFavorite } = props;

  useEffect(() => {
    // On the window, not the list: focus stays in the header's search field,
    // so the list would never see these keys.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (pending !== null || flat.length === 0) return;
      const step = (delta: number): void => {
        event.preventDefault();
        setActive((index) => (index + delta + flat.length) % flat.length);
      };

      if (event.key === 'ArrowDown' || (event.key === 'n' && event.ctrlKey)) step(1);
      else if (event.key === 'ArrowUp' || (event.key === 'p' && event.ctrlKey)) step(-1);
      else if (event.key === 'Home') {
        event.preventDefault();
        setActive(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setActive(flat.length - 1);
      } else if (event.key === 'Tab') {
        // Tab moves by section, which is the only navigation the arrows do not
        // cover: a long catalog is faster to cross a heading at a time.
        event.preventDefault();
        const backwards = event.shiftKey;
        setActive((index) => nextSectionStart(sectionStarts, index, backwards));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const entry = flat[active];
        if (!entry || disabled) return;
        if (entry.command.inputPlaceholder !== undefined && entry.input.trim().length === 0) {
          setPending({ command: entry.command, input: entry.input });
          return;
        }
        onRun(entry.command, entry.input);
      } else if (event.key === 'd' && event.ctrlKey) {
        event.preventDefault();
        const entry = flat[active];
        if (entry) onToggleFavorite(entry.command.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, flat, pending, sectionStarts, disabled, onRun, onToggleFavorite]);

  const choose = (command: PaletteCommand, input: string): void => {
    if (props.disabled) return;
    if (command.inputPlaceholder !== undefined && input.trim().length === 0) {
      setPending({ command, input });
      return;
    }
    props.onRun(command, input);
  };

  if (pending) {
    const PendingIcon = iconFor(pending.command.group);
    return (
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-3 px-4 py-4"
      >
        <p className="flex items-center gap-2 text-caption text-fg-secondary">
          <PendingIcon className="h-3.5 w-3.5 text-accent" />
          {pending.command.label}
        </p>
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
        <p className="flex items-center gap-2 text-caption text-fg-muted">
          <Kbd>Enter</Kbd> run
          <Kbd>Esc</Kbd> back
        </p>
      </motion.div>
    );
  }

  // Teach the star once, on the screen where it would be used, and only while
  // the user is not searching: a hint under a filtered list is in the way.
  const teachFavorites = props.query.length === 0 && props.favorites.length === 0 && flat.length > 0;

  return (
    <>
      <div
        id="command-list"
        role="listbox"
        aria-label="Commands"
        className="max-h-[26rem] flex-1 overflow-y-auto px-2 pb-2 pt-1"
      >
        {flat.length === 0 ? (
          <p className="px-3 py-10 text-center text-caption text-fg-muted">
            No command matches “{props.query}”
          </p>
        ) : null}

        <AnimatePresence initial={false}>
          {sections.map((section) => {
            const Icon = iconFor(section.title);
            return (
              <motion.div key={section.title} variants={fade} initial="hidden" animate="visible" exit="exit">
                <p className="flex items-center gap-1.5 px-3 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
                  <Icon className="h-3 w-3" />
                  {section.title}
                </p>
                {section.items.map((entry) => {
                  const index = flat.indexOf(entry);
                  const isActive = index === active;
                  const starred = props.favorites.includes(entry.command.id);
                  const RowIcon = iconFor(entry.command.group);
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
                        'group relative flex w-full cursor-default items-center gap-2.5 rounded-control px-3 py-2 text-left text-body transition-colors duration-fast ease-calm',
                        isActive ? 'bg-accent-subtle text-fg-primary' : 'hover:bg-surface-hover',
                        props.disabled && 'pointer-events-none opacity-50',
                      )}
                    >
                      {/* The active row gets an accent rail rather than a heavy
                        fill: the popup is read at a glance and one strong
                        colour per screen is enough. */}
                      {isActive ? (
                        <motion.span
                          layoutId="active-rail"
                          className="absolute left-0 top-1.5 h-[calc(100%-0.75rem)] w-0.5 rounded-full bg-accent"
                        />
                      ) : null}
                      <RowIcon
                        className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-fg-muted')}
                      />
                      <span className="flex-1 truncate">
                        {entry.command.label}
                        {entry.input ? <span className="text-fg-muted"> · {entry.input}</span> : null}
                      </span>
                      {isActive ? (
                        <span className="flex shrink-0 items-center gap-1 text-fg-muted">
                          <CornerDownLeft className="h-3 w-3" />
                        </span>
                      ) : null}
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
                          'shrink-0 rounded p-0.5 transition-opacity duration-fast hover:bg-surface',
                          starred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                        )}
                      >
                        <Star className={cn('h-3.5 w-3.5', starred && 'fill-current text-accent')} />
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {teachFavorites ? (
        <EmptyState
          kind="no-favorites"
          size="sm"
          className="shrink-0 border-t border-border/70 py-4"
          description={
            <>
              Press <Kbd combo="Ctrl+D" /> on a command and it moves to the top of this list.
            </>
          }
        />
      ) : null}
    </>
  );
}
