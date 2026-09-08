/**
 * The cheatsheet is one list of facts with two audiences: the settings window
 * and the popup bind different keys, so the data is split by scope rather than
 * by a per-screen component that would drift from what the handlers do.
 */
export type ShortcutScope = 'main' | 'popup';

interface Shortcut {
  /** Rendered as key caps; a slash separates alternatives. */
  readonly keys: string;
  readonly what: string;
}

interface ShortcutGroup {
  readonly title: string;
  readonly items: readonly Shortcut[];
}

const HELP_ROW: Shortcut = { keys: 'F1 / Ctrl+/', what: 'Show this list' };

const MAIN: readonly ShortcutGroup[] = [
  {
    title: 'Anywhere',
    items: [
      { keys: 'Ctrl+K', what: 'Command palette' },
      { keys: 'Tab / Shift+Tab', what: 'Next / previous control' },
      { keys: 'Escape', what: 'Close palette, clear a search, cancel an edit' },
      HELP_ROW,
    ],
  },
  {
    title: 'Settings',
    items: [
      { keys: 'Ctrl+F', what: 'Search settings' },
      { keys: '↑ / ↓', what: 'Move between sections' },
      { keys: 'Home / End', what: 'First / last section' },
    ],
  },
  {
    title: 'Prompt editor',
    items: [
      { keys: 'Ctrl+Enter', what: 'Save the prompt' },
      { keys: 'Escape', what: 'Stop editing and clear the draft' },
    ],
  },
];

const POPUP: readonly ShortcutGroup[] = [
  {
    title: 'Commands',
    items: [
      { keys: '↑ / ↓', what: 'Move (Ctrl+P / Ctrl+N also work)' },
      { keys: 'Tab / Shift+Tab', what: 'Jump a whole section' },
      { keys: 'Home / End', what: 'First / last command' },
      { keys: 'Enter', what: 'Run the highlighted command' },
      { keys: 'Ctrl+D', what: 'Favourite the highlighted command' },
      { keys: 'Ctrl+K', what: 'Back to the search field' },
    ],
  },
  {
    title: 'Answer',
    items: [
      { keys: 'Ctrl+Enter', what: 'Replace the selected text' },
      { keys: 'Escape', what: 'Back to the commands, then close the popup' },
      HELP_ROW,
    ],
  },
];

export const SHORTCUTS: Record<ShortcutScope, readonly ShortcutGroup[]> = { main: MAIN, popup: POPUP };

export const SHORTCUT_SHEET_EVENT = 'ai-anywhere:shortcut-sheet';

/** Opens the cheatsheet from anywhere in the window that owns a dialog. */
export const openShortcutSheet = (): void => {
  window.dispatchEvent(new Event(SHORTCUT_SHEET_EVENT));
};

/**
 * `?` is the conventional gesture but it is also a character, so it only
 * counts outside a field the user is typing into. F1 and Ctrl+/ work
 * everywhere, which is what the popup needs — its search field always has
 * focus.
 */
const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function isHelpKey(event: KeyboardEvent): boolean {
  if (event.altKey) return false;
  if (event.key === 'F1') return true;
  if (event.key === '/' && (event.ctrlKey || event.metaKey)) return true;
  return event.key === '?' && !event.ctrlKey && !event.metaKey && !isTyping(event.target);
}
