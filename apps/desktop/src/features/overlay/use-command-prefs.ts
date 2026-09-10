import { useCallback, useMemo, useState } from 'react';
import { useFavorites, useToggleFavorite } from './api/favorites.queries.js';

export interface RecentPrompt {
  readonly commandId: string;
  /** The extra line the user typed, for commands that ask for one. */
  readonly input: string;
}

const RECENTS_KEY = 'lipikit.recents';
const MAX_RECENTS = 6;

/**
 * Recents stay in localStorage: they are per-window UI sugar that only the
 * popup reads, and a DB round trip on every command run would buy nothing.
 * Favourites are different — the settings window shows them too — so those
 * live in SQLite behind `useFavorites`.
 */
const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    // Corrupt or unavailable storage must never stop the popup from opening.
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Nothing to do; favourites are not worth an error banner. */
  }
};

export function useCommandPrefs(): {
  favorites: readonly string[];
  recents: readonly RecentPrompt[];
  isFavorite: (commandId: string) => boolean;
  toggleFavorite: (commandId: string) => void;
  remember: (prompt: RecentPrompt) => void;
} {
  const stored = useFavorites('command');
  const toggle = useToggleFavorite('command');
  // A failed read must not stop the palette from opening: no stars is a
  // degraded palette, an error boundary is no palette at all.
  const favorites = useMemo(() => stored.data ?? [], [stored.data]);
  const [recents, setRecents] = useState<readonly RecentPrompt[]>(() =>
    read<RecentPrompt[]>(RECENTS_KEY, []),
  );

  const toggleFavorite = useCallback(
    (commandId: string) => {
      toggle.mutate(commandId);
    },
    [toggle],
  );

  const remember = useCallback((prompt: RecentPrompt) => {
    setRecents((previous) => {
      // Same command with the same input is one entry, moved to the front,
      // so re-running "Translate → German" does not fill the list with itself.
      const next = [
        prompt,
        ...previous.filter((entry) => entry.commandId !== prompt.commandId || entry.input !== prompt.input),
      ].slice(0, MAX_RECENTS);
      write(RECENTS_KEY, next);
      return next;
    });
  }, []);

  return {
    favorites,
    recents,
    isFavorite: useCallback((commandId: string) => favorites.includes(commandId), [favorites]),
    toggleFavorite,
    remember,
  };
}
